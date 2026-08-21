class NegotiationAgent:
    name = "Negotiation Agent"

    def run(self, recommendation: dict) -> dict:
        max_offer = int(recommendation.get("max_authorized_offer", 0))
        if max_offer <= 0:
            return {"discount": 0, "final_price": recommendation["price"], "policy": "No authorized offer available"}
        discount = min(max_offer, max(100, int(recommendation["price"] * 0.02)))
        return {
            "discount": discount,
            "final_price": recommendation["price"] - discount,
            "policy": "Offer remains within merchant-defined discount authority",
        }
