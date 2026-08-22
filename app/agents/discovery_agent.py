from __future__ import annotations

import hashlib
import re
from app.services.catalog import products, event_vendors


class DiscoveryAgent:
    name = "Discovery Agent"

    @staticmethod
    def _tokens(value: str) -> set[str]:
        return {x for x in re.findall(r"[a-z0-9]+", (value or "").lower()) if len(x) > 1}

    @staticmethod
    def _display_name(query: str) -> str:
        cleaned = re.sub(r"\s+", " ", (query or "product")).strip(" .,-")
        return cleaned[:80].title() or "Product"

    @staticmethod
    def _default_price(query: str) -> int:
        """Demo-only anchor used when a user gives no budget and no listing exists."""
        text = (query or "").lower()
        anchors = [
            (("laptop", "notebook"), 59990),
            (("xbox", "playstation", "console"), 39990),
            (("phone", "smartphone", "mobile"), 17990),
            (("tv", "television"), 24990),
            (("camera", "dslr", "mirrorless"), 44990),
            (("tablet",), 21990),
            (("monitor",), 12990),
            (("smartwatch", "smart watch"), 3990),
            (("earbuds", "headphones", "speaker"), 1990),
            (("keyboard", "mouse"), 1490),
            (("steel rack", "rack", "desk", "table"), 3490),
            (("chair",), 1490),
            (("pressure cooker", "cookware", "kadai", "pan"), 1790),
            (("drill", "tool kit", "tools"), 2490),
            (("shirt", "tshirt", "t-shirt", "jeans", "hoodie"), 999),
            (("shoe", "shoes", "sneaker"), 1490),
            (("towel", "bottle", "storage box", "plastic box"), 499),
            (("pvc pipe", "steel pipe", "steel tube", "aluminium sheet", "aluminum sheet"), 999),
            (("toy", "doll", "blocks"), 799),
        ]
        for keywords, price in anchors:
            if any(k in text for k in keywords):
                return price
        return 999

    def _universal_demo_options(self, intent: dict) -> list[dict]:
        """
        Create deterministic prototype listings for ANY product phrase when the
        connected demo catalogue has no direct record. These are intentionally
        labelled demo listings so the UI never pretends they are live market SKUs.
        """
        query = intent.get("product_query") or intent.get("category") or "product"
        label = self._display_name(query)
        budget = intent.get("budget_max")
        prefs = [str(p) for p in intent.get("preferences", [])]

        if budget:
            budget = max(int(budget), 100)
            raw_prices = [max(99, int(budget * 0.58)), max(99, int(budget * 0.76)), max(99, int(budget * 0.92))]
        else:
            anchor = self._default_price(query)
            raw_prices = [max(99, int(anchor * 0.72)), anchor, int(anchor * 1.28)]

        variants = [
            ("Value", 4.2, 3),
            ("Balanced", 4.5, 2),
            ("Premium", 4.7, 2),
        ]
        digest = hashlib.sha1(query.encode("utf-8")).hexdigest()[:6].upper()
        items: list[dict] = []
        for index, ((variant, rating, delivery), price) in enumerate(zip(variants, raw_prices), start=1):
            feature_bits = ["Universal prototype listing"]
            if prefs:
                feature_bits.append("Matches: " + ", ".join(prefs[:3]))
            items.append({
                "id": f"UNI-{digest}-{index}",
                "category": intent.get("category") or query,
                "name": f"{label} — {variant} Option",
                "merchant": "Nexora Universal Demo Catalogue",
                "price": price,
                "stock": 25 - index * 3,
                "delivery_days": delivery,
                "rating": rating,
                "feature": " · ".join(feature_bits),
                "material": next((p for p in prefs if p in {"plastic", "metal", "steel", "aluminium", "aluminum", "wood", "wooden", "soft", "hard"}), "Variant dependent"),
                "max_authorized_offer": max(0, int(price * 0.04)),
                "synthetic_demo": True,
                "source_note": "Generated for prototype coverage; not a live marketplace listing",
            })
        return items

    def run(self, intent: dict) -> list[dict]:
        mission_type = intent.get("mission_type")
        budget = intent.get("budget_max")
        category = intent.get("category")
        product_query = (intent.get("product_query") or category or "").lower().strip()

        if mission_type == "product_purchase":
            items = [p for p in products() if p.get("stock", 0) > 0]

            # First try exact canonical category matches.
            exact = [p for p in items if p.get("category") == category] if category and category != "general" else []

            # Then use universal text matching across name/category/material/features.
            if not exact and product_query:
                query_tokens = self._tokens(product_query)
                scored: list[tuple[int, dict]] = []
                for product in items:
                    searchable = " ".join(str(product.get(k, "")) for k in ["name", "category", "material", "feature", "style", "capacity"])
                    product_tokens = self._tokens(searchable)
                    overlap = len(query_tokens & product_tokens)
                    if product_query in searchable.lower():
                        overlap += 3
                    if overlap:
                        scored.append((overlap, product))
                scored.sort(key=lambda row: (-row[0], row[1].get("price", 0)))
                exact = [p for _, p in scored]

            if budget:
                exact = [p for p in exact if p["price"] <= budget]

            # Universal fallback: every normal product request gets useful prototype options.
            if not exact:
                return self._universal_demo_options(intent)

            return exact

        if mission_type == "multi_merchant_event":
            return event_vendors()

        return []
