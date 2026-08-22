import re
from typing import Any


class IntentAgent:
    name = "Intent Agent"

    PRODUCT_KEYWORDS = {
        "laptop": ["laptop", "notebook", "computer"],
        "shoes": ["shoe", "shoes", "sneaker", "sneakers", "running shoe", "sports shoe"],
        "phone": ["phone", "mobile", "smartphone"],
        "earbuds": ["earbud", "earbuds", "tws", "wireless buds"],
        "backpack": ["bag", "backpack", "rucksack"],
    }

    def run(self, message: str) -> dict[str, Any]:
        text = message.lower().strip()
        budgets = [int(x.replace(",", "")) for x in re.findall(r"(?:₹|rs\.?\s*)?([0-9][0-9,]{2,})", text)]
        budget = max(budgets) if budgets else None

        category = None
        for candidate, keywords in self.PRODUCT_KEYWORDS.items():
            if any(keyword in text for keyword in keywords):
                category = candidate
                break

        if category:
            mission_type = "product_purchase"
        elif any(word in text for word in ["birthday", "event", "party", "farewell"]):
            mission_type = "multi_merchant_event"
            category = "event"
        elif any(word in text for word in ["revenue", "sales", "leak", "conversion", "merchant"]):
            mission_type = "merchant_intelligence"
            category = "merchant"
        else:
            mission_type = "general_commerce"
            category = "general"

        preferences: list[str] = []
        for keyword in [
            "ai", "coding", "gaming", "battery", "student", "delivery", "vegetarian", "spicy",
            "running", "sports", "casual", "comfort", "camera", "5g", "anc", "water resistant"
        ]:
            if keyword in text:
                preferences.append(keyword)

        people_match = re.search(r"(\d+)\s*(?:people|persons|students|guests|friends)", text)
        people = int(people_match.group(1)) if people_match else None

        return {
            "mission_type": mission_type,
            "category": category,
            "budget_max": budget,
            "preferences": preferences,
            "people": people,
            "raw_goal": message.strip(),
            "payment_requires_confirmation": True,
        }
