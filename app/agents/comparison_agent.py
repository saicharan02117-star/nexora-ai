from typing import Any


class ComparisonAgent:
    name = "Comparison Agent"

    def score_product(self, product: dict[str, Any], intent: dict[str, Any]) -> tuple[float, list[str]]:
        score = 60.0
        reasons: list[str] = []
        prefs = set(intent.get("preferences", []))
        budget = intent.get("budget_max")
        category = intent.get("category")
        query = str(intent.get("product_query") or "").lower()

        if category == "laptop":
            if int(product.get("ram_gb", 0)) >= 16:
                score += 8
                reasons.append("16GB+ memory supports development workloads")
            if product.get("gpu_tier", 0) >= 2 and ("ai" in prefs or "gaming" in prefs):
                score += 12
                reasons.append("Dedicated graphics improve accelerated workloads")
            if product.get("cpu_tier", 0) >= 3:
                score += 10
                reasons.append("High-performance processor")
            if product.get("storage_gb", 0) >= 512:
                score += 4
                reasons.append("Practical SSD capacity")
        elif category == "shoes":
            style = str(product.get("style", ""))
            if "running" in prefs and style == "running":
                score += 12
                reasons.append("Matches the requested running use")
            elif "sports" in prefs and style in {"sports", "training", "running"}:
                score += 10
                reasons.append("Suitable for sports and active use")
            elif "casual" in prefs and style == "casual":
                score += 10
                reasons.append("Matches the requested casual style")
            if "mesh" in str(product.get("material", "")).lower():
                score += 5
                reasons.append("Breathable upper material")
        elif category == "phone":
            if "5g" in prefs or "5g" in product.get("name", "").lower():
                score += 8
                reasons.append("5G-ready option")
            if "camera" in prefs and ("64" in product.get("camera", "") or "50" in product.get("camera", "")):
                score += 8
                reasons.append("Strong camera specification for the budget")
            if "battery" in prefs:
                score += 6
                reasons.append("Large battery capacity")
        elif category == "earbuds":
            if "anc" in prefs and "anc" in product.get("feature", "").lower():
                score += 12
                reasons.append("Active noise cancellation matches the request")
            if "battery" in prefs:
                score += 6
                reasons.append("Long battery-life option")
        elif category == "backpack":
            if "water resistant" in prefs and "water resistant" in product.get("feature", "").lower():
                score += 10
                reasons.append("Water-resistant design matches the request")
            if "laptop" in product.get("feature", "").lower():
                score += 6
                reasons.append("Includes a dedicated laptop sleeve")
        else:
            searchable = " ".join(str(v) for v in product.values()).lower()
            if query and query in searchable:
                score += 16
                reasons.append("Direct match for the requested item")
            for pref in prefs:
                if pref in searchable:
                    score += 5
                    reasons.append(f"Matches requested {pref} preference")
            if product.get("category"):
                reasons.append(f"Available in {str(product['category']).replace('_', ' ')} category")

        if budget:
            headroom = budget - product["price"]
            if headroom >= max(300, budget * 0.1):
                score += 6
                reasons.append("Leaves useful headroom in the budget")
            elif headroom >= 0:
                score += 3
                reasons.append("Fits within the stated budget")

        if product.get("delivery_days", 99) <= 2:
            score += 4
            reasons.append("Fast delivery")
        if product.get("rating", 0) >= 4.4:
            score += 4
            reasons.append("Strong merchant rating signal")

        if not reasons:
            reasons.append("Best available match for the stated constraints")

        # Remove duplicate explanations while preserving order.
        reasons = list(dict.fromkeys(reasons))
        return min(score, 99.0), reasons[:4]

    def run(self, items: list[dict], intent: dict) -> list[dict]:
        ranked = []
        for item in items:
            score, reasons = self.score_product(item, intent)
            ranked.append({**item, "score": round(score, 1), "reasons": reasons})
        ranked.sort(key=lambda x: (-x["score"], x["price"]))
        return ranked[:3]
