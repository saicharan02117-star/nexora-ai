import re
from typing import Any


class IntentAgent:
    name = "Intent Agent"

    def run(self, message: str) -> dict[str, Any]:
        text = message.lower().strip()
        budgets = [int(x.replace(",", "")) for x in re.findall(r"(?:₹|rs\.?\s*)?([0-9][0-9,]{2,})", text)]
        budget = max(budgets) if budgets else None

        if "laptop" in text or "notebook" in text:
            mission_type = "product_purchase"
            category = "laptop"
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
        for keyword in ["ai", "coding", "gaming", "battery", "student", "delivery", "vegetarian", "spicy"]:
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
