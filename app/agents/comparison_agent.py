from typing import Any


class ComparisonAgent:
    name = "Comparison Agent"

    def score_product(self, product: dict[str, Any], intent: dict[str, Any]) -> tuple[float, list[str]]:
        score = 60.0
        reasons: list[str] = []
        prefs = set(intent.get("preferences", []))
        budget = intent.get("budget_max")

        ram_gb = int(str(product.get("ram_gb", 0)))
        if ram_gb >= 16:
            score += 8
            reasons.append("16GB+ memory supports development workloads")
        if product.get("gpu_tier", 0) >= 2 and ("ai" in prefs or "gaming" in prefs):
            score += 12
            reasons.append("Dedicated graphics improve AI and accelerated workloads")
        if product.get("cpu_tier", 0) >= 3:
            score += 10
            reasons.append("High-performance processor")
        if product.get("storage_gb", 0) >= 512:
            score += 4
            reasons.append("Practical SSD capacity")
        if budget:
            headroom = budget - product["price"]
            if headroom >= 3000:
                score += 5
                reasons.append("Leaves useful headroom in the budget")
            elif headroom >= 0:
                score += 2
        if product.get("delivery_days", 99) <= 2:
            score += 3
            reasons.append("Fast delivery")
        if product.get("rating", 0) >= 4.4:
            score += 3
            reasons.append("Strong merchant rating signal")
        return min(score, 99.0), reasons[:4]

    def run(self, items: list[dict], intent: dict) -> list[dict]:
        ranked = []
        for item in items:
            score, reasons = self.score_product(item, intent)
            ranked.append({**item, "score": round(score, 1), "reasons": reasons})
        ranked.sort(key=lambda x: (-x["score"], x["price"]))
        return ranked[:3]
