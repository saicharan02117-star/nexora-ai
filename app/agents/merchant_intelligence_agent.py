class MerchantIntelligenceAgent:
    name = "Merchant Intelligence Agent"

    def run(self) -> dict:
        leakage = [
            {"cause": "Checkout abandonment", "value": 12400, "action": "Recover high-intent carts with issue-specific follow-up"},
            {"cause": "Payment failure", "value": 8900, "action": "Offer safe retry path and preserve the cart state"},
            {"cause": "Inventory mismatch", "value": 6300, "action": "Suppress unavailable inventory and recommend substitutes"},
            {"cause": "Delivery friction", "value": 4700, "action": "Surface delivery certainty earlier in the journey"},
            {"cause": "Other", "value": 2000, "action": "Review low-frequency journey failures"},
        ]
        actual = 148400
        potential = actual + sum(x["value"] for x in leakage)
        return {
            "revenue_today": actual,
            "potential_revenue": potential,
            "leakage": potential - actual,
            "conversion_rate": 3.8,
            "payment_success_rate": 91.6,
            "leakage_breakdown": leakage,
        }
