from __future__ import annotations

import hashlib
import re
from app.services.catalog import products, event_vendors
from app.services.brand_priority import brands_for_query, classify_brand


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
        text = (query or "").lower()
        anchors = [
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
            (("tshirt", "t-shirt"), 499),
            (("shirt",), 699),
            (("jeans", "trouser", "pants"), 999),
            (("hoodie", "jacket"), 1499),
            (("shoe", "shoes", "sneaker"), 1490),
            (("backpack", "school bag", "rucksack"), 999),
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
            (("screwdriver", "pliers", "wrench", "hammer"), 299),
            (("tool kit",), 1490),
            (("drill",), 2490),
            (("pvc pipe",), 499),
            (("steel pipe", "steel tube"), 999),
            (("aluminium sheet", "aluminum sheet", "metal sheet"), 999),
            (("foam mat", "eva foam", "rubber mat"), 499),
            (("keyboard",), 1490),
            (("mouse",), 799),
            (("earbuds", "tws"), 1490),
            (("headphones",), 1990),
            (("speaker",), 1990),
            (("smartwatch", "smart watch"), 3990),
            (("monitor",), 12990),
            (("tablet",), 21990),
            (("phone", "smartphone", "mobile"), 14999),
            (("tv", "television"), 24990),
            (("xbox", "playstation", "ps5", "console"), 39990),
            (("camera", "dslr", "mirrorless"), 44990),
            (("laptop", "notebook"), 59990),
            (("football", "basketball"), 699),
            (("cricket bat",), 1490),
            (("badminton", "racket"), 899),
            (("toy", "doll", "blocks"), 799),
        ]
        for keywords, price in anchors:
            if any(k in text for k in keywords):
                return price
        if any(k in text for k in ["plastic", "cotton", "cloth", "soft", "rubber"]):
            return 299
        if any(k in text for k in ["steel", "metal", "iron", "aluminium", "aluminum", "wood", "wooden"]):
            return 999
        if any(k in text for k in ["electric", "electronic", "wireless", "bluetooth", "smart"]):
            return 1990
        return 499

    @staticmethod
    def _estimated_prices(anchor: int, budget: int | None, count: int = 5) -> list[int]:
        anchor = max(49, int(anchor))
        factors = [0.72, 0.90, 1.0, 1.18, 1.42]
        prices = [max(49, int(anchor * f)) for f in factors[:count]]
        if budget:
            cap = max(49, int(budget))
            prices = [min(p, cap) for p in prices]
        return prices

    def _brand_first_options(self, intent: dict) -> list[dict]:
        """Return India-first brand suggestions without inventing an exact model/SKU.

        These entries are deliberately labelled estimates. Exact product names,
        current prices, stock and seller photos should only come from a connected
        retailer/search feed.
        """
        query = intent.get("product_query") or intent.get("category") or "product"
        label = self._display_name(query)
        budget = intent.get("budget_max")
        prefs = [str(p) for p in intent.get("preferences", [])]
        anchor = self._default_price(query)
        brand_groups = brands_for_query(query)
        indian = brand_groups.get("indian", [])
        international = brand_groups.get("international", [])

        brand_sequence: list[tuple[str | None, str]] = []
        for brand in indian[:3]:
            brand_sequence.append((brand, "Indian brand"))
        for brand in international[:2]:
            brand_sequence.append((brand, "International alternative"))
        if not brand_sequence:
            brand_sequence = [(None, "Local / unbranded option") for _ in range(3)]

        raw_prices = self._estimated_prices(anchor, budget, len(brand_sequence))
        digest = hashlib.sha1(query.encode("utf-8")).hexdigest()[:6].upper()
        items: list[dict] = []

        for index, ((brand, origin), price) in enumerate(zip(brand_sequence, raw_prices), start=1):
            feature_bits = ["India-first brand discovery", origin]
            if prefs:
                feature_bits.append("Requested: " + ", ".join(prefs[:3]))
            display_name = f"{brand} — {label}" if brand else f"Local / unbranded — {label}"
            items.append({
                "id": f"BRAND-{digest}-{index}",
                "category": intent.get("category") or query,
                "name": display_name,
                "brand": brand or "Local / unbranded",
                "brand_origin": classify_brand(brand) if brand else "local",
                "merchant": "Nexora Brand Discovery",
                "price": price,
                "stock": 1,
                "delivery_days": 2 + (index % 2),
                "rating": 4.2 + min(index, 3) * 0.1,
                "feature": " · ".join(feature_bits),
                "material": next((p for p in prefs if p in {"plastic", "metal", "steel", "aluminium", "aluminum", "wood", "wooden", "soft", "hard", "cotton", "rubber"}), "Depends on selected product"),
                "max_authorized_offer": 0,
                "synthetic_demo": True,
                "source_note": "Brand suggestion with estimated price range; exact model, live price, stock and seller image are not verified",
            })
        return items

    @staticmethod
    def _trusted_catalog_items() -> list[dict]:
        """Only exact listings explicitly marked verified may outrank brand discovery.

        The legacy data file contains fictional demo SKUs (for example NovaPhone),
        so they must never be presented as real product recommendations.
        """
        return [
            p for p in products()
            if p.get("stock", 0) > 0 and p.get("verified_listing") is True
        ]

    def run(self, intent: dict) -> list[dict]:
        mission_type = intent.get("mission_type")
        budget = intent.get("budget_max")
        category = intent.get("category")
        product_query = (intent.get("product_query") or category or "").lower().strip()

        if mission_type == "product_purchase":
            items = self._trusted_catalog_items()
            exact = [p for p in items if p.get("category") == category] if category and category != "general" else []

            if not exact and product_query and items:
                query_tokens = self._tokens(product_query)
                scored: list[tuple[int, dict]] = []
                for product in items:
                    searchable = " ".join(str(product.get(k, "")) for k in ["name", "brand", "category", "material", "feature", "style", "capacity"])
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

            if exact:
                return exact

            # Until a retailer/search feed provides verified exact listings,
            # always use real brand names + clearly marked estimates instead of
            # fictional product names or fake merchant offers.
            return self._brand_first_options(intent)

        if mission_type == "multi_merchant_event":
            return event_vendors()
        return []
