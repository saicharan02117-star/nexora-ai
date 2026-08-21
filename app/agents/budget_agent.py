from collections import defaultdict


class BudgetAgent:
    name = "Budget Agent"

    def product_summary(self, recommendations: list[dict], budget: int | None) -> dict:
        if not recommendations:
            return {"status": "no_match"}
        best = recommendations[0]
        return {
            "budget": budget,
            "best_price": best["price"],
            "remaining": (budget - best["price"]) if budget else None,
            "status": "within_budget" if not budget or best["price"] <= budget else "over_budget",
        }

    def event_bundle(self, vendors: list[dict], budget: int | None, people: int | None) -> dict:
        grouped: dict[str, list[dict]] = defaultdict(list)
        for vendor in vendors:
            grouped[vendor["category"]].append(vendor)

        chosen = []
        for category, options in grouped.items():
            options.sort(key=lambda x: (x["price"], -x.get("rating", 0)))
            chosen.append(options[0])

        total = sum(v["price"] for v in chosen)
        if budget and total > budget:
            chosen.sort(key=lambda x: x["price"], reverse=True)
        return {
            "people": people,
            "budget": budget,
            "selected_vendors": chosen,
            "total": total,
            "remaining": (budget - total) if budget else None,
            "status": "within_budget" if not budget or total <= budget else "over_budget",
        }
