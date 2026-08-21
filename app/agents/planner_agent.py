class PlannerAgent:
    name = "Planner Agent"

    def run(self, intent: dict) -> list[str]:
        mission_type = intent.get("mission_type")
        if mission_type == "product_purchase":
            return [
                "Extract purchase constraints",
                "Search eligible merchant inventory",
                "Filter by budget and availability",
                "Score products against intended use",
                "Compare top options",
                "Prepare merchant-authorized offer if available",
                "Request user approval",
                "Create and verify payment",
            ]
        if mission_type == "multi_merchant_event":
            return [
                "Understand event requirements",
                "Allocate budget across service categories",
                "Discover eligible vendors",
                "Build a multi-merchant bundle",
                "Optimize total cost and reserve",
                "Request approval before checkout",
                "Create transaction plan",
            ]
        if mission_type == "merchant_intelligence":
            return [
                "Read funnel metrics",
                "Locate revenue leakage",
                "Rank causes by recoverable value",
                "Generate next-best growth actions",
            ]
        return ["Understand goal", "Identify required services", "Prepare an executable commerce plan"]
