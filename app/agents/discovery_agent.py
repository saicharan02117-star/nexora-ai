from app.services.catalog import products, event_vendors


class DiscoveryAgent:
    name = "Discovery Agent"

    def run(self, intent: dict) -> list[dict]:
        mission_type = intent.get("mission_type")
        budget = intent.get("budget_max")
        category = intent.get("category")

        if mission_type == "product_purchase":
            items = [p for p in products() if p.get("stock", 0) > 0]
            if category and category != "general":
                items = [p for p in items if p.get("category") == category]
            if budget:
                items = [p for p in items if p["price"] <= budget]
            return items

        if mission_type == "multi_merchant_event":
            return event_vendors()

        return []
