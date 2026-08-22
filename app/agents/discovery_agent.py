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
        """Offline prototype anchor. It is an estimate, never a live market price."""
        text = (query or "").lower()

        anchors = [
            # Very low-cost daily essentials
            (("underwear", "brief", "vest", "innerwear"), 149),
            (("handkerchief", "hanky", "toothbrush", "comb"), 79),
            (("socks", "sock"), 99),
            (("towel", "napkin", "kitchen towel"), 249),
            (("plastic mug", "mug", "plastic bowl"), 99),
            (("bucket", "plastic bucket"), 199),
            (("bottle", "water bottle"), 249),
            (("slipper", "slippers", "flip flop", "flip-flop"), 299),
            (("pillow cover", "cushion cover"), 199),
            (("bedsheet", "bed sheet"), 599),
            (("pillow", "cushion"), 399),

            # Clothing / soft goods
            (("tshirt", "t-shirt"), 499),
            (("shirt",), 699),
            (("jeans", "trouser", "pants"), 999),
            (("hoodie", "jacket"), 1499),
            (("shoe", "shoes", "sneaker"), 1490),
            (("backpack", "school bag", "rucksack"), 999),

            # Home / kitchen / storage
            (("plastic chair",), 699),
            (("chair",), 1490),
            (("steel rack", "rack"), 2990),
            (("study table", "desk", "table"), 3490),
            (("storage box", "plastic box", "organizer"), 499),
            (("pressure cooker",), 1790),
            (("kadai", "pan", "cookware", "pot"), 999),
            (("kettle",), 999),
            (("mixer", "grinder"), 2490),
            (("fan",), 1990),
            (("iron",), 899),

            # Tools / materials
            (("screwdriver", "pliers", "wrench", "hammer"), 299),
            (("tool kit",), 1490),
            (("drill",), 2490),
            (("pvc pipe",), 499),
            (("steel pipe", "steel tube"), 999),
            (("aluminium sheet", "aluminum sheet", "metal sheet"), 999),
            (("foam mat", "eva foam", "rubber mat"), 499),

            # Electronics
            (("keyboard",), 1490),
            (("mouse",), 799),
            (("earbuds", "tws"), 1490),
            (("headphones",), 1990),
            (("speaker",), 1990),
            (("smartwatch", "smart watch"), 3990),
            (("monitor",), 12990),
            (("tablet",), 21990),
            (("phone", "smartphone", "mobile"), 17990),
            (("tv", "television"), 24990),
            (("xbox", "playstation", "ps5", "console"), 39990),
            (("camera", "dslr", "mirrorless"), 44990),
            (("laptop", "notebook"), 59990),

            # Sports / toys
            (("football", "basketball"), 699),
            (("cricket bat",), 1490),
            (("badminton", "racket"), 899),
            (("toy", "doll", "blocks"), 799),
        ]

        for keywords, price in anchors:
            if any(k in text for k in keywords):
                return price

        # Generic offline estimate by material/type words when the item is unknown.
        if any(k in text for k in ["plastic", "cotton", "cloth", "soft", "rubber"]):
            return 299
        if any(k in text for k in ["steel", "metal", "iron", "aluminium", "aluminum", "wood", "wooden"]):
            return 999
        if any(k in text for k in ["electric", "electronic", "wireless", "bluetooth", "smart"]):
            return 1990
        return 499

    @staticmethod
    def _estimated_prices(anchor: int, budget: int | None) -> list[int]:
        """Create realistic offline demo tiers without scaling price up to the user's budget."""
        anchor = max(49, int(anchor))
        prices = [max(49, int(anchor * 0.70)), anchor, max(anchor + 1, int(anchor * 1.45))]

        if budget:
            cap = max(49, int(budget))
            affordable = [p for p in prices if p <= cap]
            if len(affordable) >= 3:
                return affordable[:3]
            if len(affordable) == 2:
                third = max(49, min(cap, int(affordable[-1] * 1.15)))
                return [affordable[0], affordable[1], max(affordable[1], third)]
            if len(affordable) == 1:
                return [max(49, int(affordable[0] * 0.8)), affordable[0], affordable[0]]
            # Budget is below the normal anchor: produce budget-constrained demo alternatives.
            return [max(49, int(cap * 0.55)), max(49, int(cap * 0.75)), max(49, int(cap * 0.95))]

        return prices

    def _universal_demo_options(self, intent: dict) -> list[dict]:
        """
        Generate offline representative options for any product phrase.
        Values are labelled estimates and are not presented as real seller prices.
        """
        query = intent.get("product_query") or intent.get("category") or "product"
        label = self._display_name(query)
        budget = intent.get("budget_max")
        prefs = [str(p) for p in intent.get("preferences", [])]
        anchor = self._default_price(query)
        raw_prices = self._estimated_prices(anchor, budget)

        variants = [
            ("Budget", 4.1, 3),
            ("Standard", 4.4, 2),
            ("Premium", 4.6, 2),
        ]
        digest = hashlib.sha1(query.encode("utf-8")).hexdigest()[:6].upper()
        items: list[dict] = []

        for index, ((variant, rating, delivery), price) in enumerate(zip(variants, raw_prices), start=1):
            feature_bits = ["Offline prototype estimate"]
            if prefs:
                feature_bits.append("Matches: " + ", ".join(prefs[:3]))

            items.append({
                "id": f"UNI-{digest}-{index}",
                "category": intent.get("category") or query,
                "name": f"{label} — {variant} Range",
                "merchant": "Nexora Offline Demo Estimator",
                "price": price,
                "stock": 1,
                "delivery_days": delivery,
                "rating": rating,
                "feature": " · ".join(feature_bits),
                "material": next((p for p in prefs if p in {"plastic", "metal", "steel", "aluminium", "aluminum", "wood", "wooden", "soft", "hard", "cotton", "rubber"}), "Depends on selected variant"),
                "max_authorized_offer": 0,
                "synthetic_demo": True,
                "source_note": "Estimated offline demo range only; not a real seller listing or verified market price",
            })
        return items

    def run(self, intent: dict) -> list[dict]:
        mission_type = intent.get("mission_type")
        budget = intent.get("budget_max")
        category = intent.get("category")
        product_query = (intent.get("product_query") or category or "").lower().strip()

        if mission_type == "product_purchase":
            items = [p for p in products() if p.get("stock", 0) > 0]

            exact = [p for p in items if p.get("category") == category] if category and category != "general" else []

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

            if not exact:
                return self._universal_demo_options(intent)

            return exact

        if mission_type == "multi_merchant_event":
            return event_vendors()

        return []
