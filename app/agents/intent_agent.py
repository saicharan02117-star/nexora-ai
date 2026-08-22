import re
from typing import Any


class IntentAgent:
    name = "Intent Agent"

    # Canonical categories are only hints. The agent also supports arbitrary
    # product phrases (for example: "xbox", "steel rack", "plastic chair").
    PRODUCT_ALIASES = {
        "laptop": ["laptop", "notebook", "computer"],
        "shoes": ["shoe", "shoes", "sneaker", "sneakers", "running shoe", "sports shoe"],
        "phone": ["phone", "mobile", "smartphone"],
        "earbuds": ["earbud", "earbuds", "tws", "wireless buds"],
        "backpack": ["bag", "backpack", "rucksack"],
        "gaming_console": ["xbox", "xbox series", "playstation", "ps5", "console", "gaming console"],
        "television": ["tv", "television", "smart tv"],
        "monitor": ["monitor", "display monitor", "gaming monitor"],
        "keyboard": ["keyboard", "mechanical keyboard"],
        "mouse": ["mouse", "gaming mouse", "wireless mouse"],
        "tablet": ["tablet", "tab"],
        "speaker": ["speaker", "bluetooth speaker", "soundbar"],
        "smartwatch": ["smartwatch", "smart watch", "fitness watch"],
        "camera": ["camera", "dslr", "mirrorless camera"],
        "chair": ["chair", "office chair", "plastic chair", "gaming chair"],
        "table": ["table", "desk", "study table", "office desk"],
        "bottle": ["bottle", "water bottle", "steel bottle", "plastic bottle"],
        "storage": ["storage box", "plastic box", "organizer", "rack", "steel rack"],
        "cookware": ["pan", "kadai", "pot", "cookware", "pressure cooker"],
        "tool": ["hammer", "screwdriver", "drill", "pliers", "saw", "tool kit", "wrench"],
        "appliance": ["fan", "iron", "mixer", "grinder", "induction", "kettle", "heater"],
        "clothing": ["shirt", "tshirt", "t-shirt", "jeans", "jacket", "hoodie", "dress"],
        "sports": ["football", "cricket bat", "badminton", "racket", "basketball", "helmet", "sports gear"],
        "toy": ["toy", "toy car", "doll", "building blocks"],
        "material": ["pvc pipe", "steel pipe", "metal sheet", "aluminium sheet", "aluminum sheet", "plastic sheet", "rope", "foam mat"],
    }

    SHOPPING_PATTERNS = [
        r"\bfind\b", r"\bshow\b", r"\bgive me\b", r"\bget me\b", r"\bbuy\b",
        r"\bi need\b", r"\bi want\b", r"\brecommend\b", r"\bsearch for\b",
        r"\blooking for\b", r"\bcompare\b", r"\bshop\b",
    ]

    @staticmethod
    def _extract_product_query(text: str) -> str:
        query = text
        query = re.sub(
            r"^(please\s+)?(find|show|give|get|buy|recommend|search for|look for|compare)\s+(me\s+)?",
            "",
            query,
        )
        query = re.sub(r"^(i\s+(need|want)\s+|i'?m\s+looking\s+for\s+)", "", query)
        query = re.sub(r"\b(of\s+)?budget\s*(?:of\s*)?(?:₹|rs\.?\s*)?[0-9][0-9,]*\b.*$", "", query)
        query = re.sub(r"\b(under|below|within|less than|max(?:imum)?|upto|up to)\s*(?:₹|rs\.?\s*)?[0-9][0-9,]*\b.*$", "", query)
        query = re.sub(r"\bfor\s+(?:₹|rs\.?\s*)?[0-9][0-9,]*\b.*$", "", query)
        query = re.sub(r"\b(best|good|cheap|affordable|online|product|item)\b", " ", query)
        query = re.sub(r"\s+", " ", query).strip(" .,-")
        return query[:120] or "product"

    def run(self, message: str) -> dict[str, Any]:
        text = message.lower().strip()
        budgets = [int(x.replace(",", "")) for x in re.findall(r"(?:₹|rs\.?\s*)?([0-9][0-9,]{2,})", text)]
        budget = max(budgets) if budgets else None

        category = None
        matched_alias = None
        for candidate, aliases in self.PRODUCT_ALIASES.items():
            for alias in sorted(aliases, key=len, reverse=True):
                if re.search(rf"(?<!\w){re.escape(alias)}(?!\w)", text):
                    category = candidate
                    matched_alias = alias
                    break
            if category:
                break

        event_request = any(word in text for word in ["birthday", "event", "party", "farewell", "wedding"])
        merchant_request = any(word in text for word in ["revenue", "sales", "leak", "conversion", "merchant", "checkout abandonment"])
        shopping_signal = any(re.search(pattern, text) for pattern in self.SHOPPING_PATTERNS)

        if merchant_request and not category:
            mission_type = "merchant_intelligence"
            category = "merchant"
        elif event_request and not category:
            mission_type = "multi_merchant_event"
            category = "event"
        elif category or shopping_signal:
            mission_type = "product_purchase"
            if not category:
                category = self._extract_product_query(text)
        else:
            mission_type = "general_commerce"
            category = "general"

        product_query = self._extract_product_query(text) if mission_type == "product_purchase" else None
        if matched_alias and product_query == "product":
            product_query = matched_alias

        preferences: list[str] = []
        preference_words = [
            "ai", "coding", "gaming", "battery", "student", "fast delivery", "vegetarian", "spicy",
            "running", "sports", "casual", "comfort", "camera", "5g", "anc", "water resistant",
            "plastic", "metal", "steel", "aluminium", "aluminum", "wood", "wooden", "soft", "hard",
            "lightweight", "heavy duty", "wireless", "portable", "durable", "foldable", "premium",
        ]
        for keyword in preference_words:
            if keyword in text:
                preferences.append(keyword)

        people_match = re.search(r"(\d+)\s*(?:people|persons|students|guests|friends)", text)
        people = int(people_match.group(1)) if people_match else None

        return {
            "mission_type": mission_type,
            "category": category,
            "product_query": product_query,
            "budget_max": budget,
            "preferences": preferences,
            "people": people,
            "raw_goal": message.strip(),
            "payment_requires_confirmation": True,
        }
