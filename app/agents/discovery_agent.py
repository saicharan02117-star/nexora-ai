from app.services.catalog import products, event_vendors


class DiscoveryAgent:
    name = "Discovery Agent"

    @staticmethod
    def _tokens(value: str) -> set[str]:
        return {token for token in value.lower().replace("-", " ").split() if len(token) > 1}

    def run(self, intent: dict) -> list[dict]:
        mission_type = intent.get("mission_type")
        budget = intent.get("budget_max")
        category = str(intent.get("category") or "").lower()
        query = str(intent.get("product_query") or category).lower()
        preferences = {str(x).lower() for x in intent.get("preferences", [])}

        if mission_type == "product_purchase":
            items = [p for p in products() if p.get("stock", 0) > 0]
            if budget:
                items = [p for p in items if p["price"] <= budget]

            # Exact category matches are preferred when the demo catalogue has them.
            category_items = [p for p in items if str(p.get("category", "")).lower() == category]
            if category_items:
                return category_items

            # Otherwise run a generic text/material search across every demo item.
            wanted = self._tokens(query) | preferences
            scored: list[tuple[int, dict]] = []
            for item in items:
                searchable = " ".join(
                    str(v) for k, v in item.items()
                    if k not in {"price", "stock", "max_authorized_offer"}
                ).lower()
                item_tokens = self._tokens(searchable)
                score = len(wanted & item_tokens)
                if query and query in searchable:
                    score += 4
                for pref in preferences:
                    if pref in searchable:
                        score += 2
                if score > 0:
                    scored.append((score, item))

            scored.sort(key=lambda pair: (-pair[0], pair[1]["price"]))
            return [item for _, item in scored]

        if mission_type == "multi_merchant_event":
            return event_vendors()

        return []
