from uuid import uuid4
from app.schemas import MissionResponse, AgentStep, Recommendation
from app.world_model.state import CommerceWorldModel
from app.security.action_wallet import DEFAULT_WALLET
from app.security.agent_firewall import AgentFirewall, ActionRequest
from .intent_agent import IntentAgent
from .planner_agent import PlannerAgent
from .discovery_agent import DiscoveryAgent
from .comparison_agent import ComparisonAgent
from .budget_agent import BudgetAgent
from .negotiation_agent import NegotiationAgent
from .merchant_intelligence_agent import MerchantIntelligenceAgent


class MasterOrchestrator:
    def __init__(self) -> None:
        self.intent_agent = IntentAgent()
        self.planner_agent = PlannerAgent()
        self.discovery_agent = DiscoveryAgent()
        self.comparison_agent = ComparisonAgent()
        self.budget_agent = BudgetAgent()
        self.negotiation_agent = NegotiationAgent()
        self.merchant_agent = MerchantIntelligenceAgent()
        self.firewall = AgentFirewall()

    def run(self, message: str, user_id: str) -> MissionResponse:
        mission_id = f"NX-{uuid4().hex[:8].upper()}"
        world = CommerceWorldModel(user_id=user_id)
        intent = self.intent_agent.run(message)
        world.intent = intent
        world.record("intent_understood", intent)
        plan = self.planner_agent.run(intent)

        steps = [AgentStep(agent="Intent Agent", summary="Converted the request into structured goals and constraints."),
                 AgentStep(agent="Planner Agent", summary=f"Created an executable {len(plan)}-step mission plan.")]

        mission_type = intent["mission_type"]
        recommendations: list[Recommendation] = []
        budget_summary: dict = {}
        next_action = "Review the plan."

        if mission_type == "product_purchase":
            discovered = self.discovery_agent.run(intent)
            steps.append(AgentStep(agent="Discovery Agent", summary=f"Found {len(discovered)} eligible in-stock products."))
            ranked = self.comparison_agent.run(discovered, intent)
            steps.append(AgentStep(agent="Comparison Agent", summary="Ranked products using budget, performance, delivery and merchant signals."))

            if ranked:
                offer = self.negotiation_agent.run(ranked[0])
                ranked[0]["original_price"] = ranked[0]["price"]
                ranked[0]["price"] = offer["final_price"]
                if offer["discount"]:
                    ranked[0]["reasons"] = [f"₹{offer['discount']} merchant-authorized offer applied"] + ranked[0]["reasons"]
                steps.append(AgentStep(agent="Negotiation Agent", summary=offer["policy"]))

            for item in ranked:
                recommendations.append(Recommendation(
                    id=item["id"], name=item["name"], merchant=item["merchant"], price=item["price"],
                    score=item["score"], reasons=item["reasons"],
                    metadata={"cpu": item["cpu"], "ram": f"{item['ram_gb']}GB", "storage": f"{item['storage_gb']}GB SSD", "delivery_days": item["delivery_days"]}
                ))

            budget_summary = self.budget_agent.product_summary(ranked, intent.get("budget_max"))
            if ranked:
                firewall = self.firewall.inspect(ActionRequest(
                    agent_id="nexora-payment-agent", action="payment", amount=ranked[0]["price"],
                    merchant=ranked[0]["merchant"], purpose=intent["raw_goal"]
                ), DEFAULT_WALLET)
                steps.append(AgentStep(agent="Agent Firewall", status="needs_confirmation" if firewall.requires_confirmation else "completed", summary=firewall.reason))
                next_action = f"Confirm the selected product and authorize ₹{ranked[0]['price']:,} checkout."
            else:
                next_action = "Adjust the budget or constraints to continue."

        elif mission_type == "multi_merchant_event":
            vendors = self.discovery_agent.run(intent)
            steps.append(AgentStep(agent="Discovery Agent", summary=f"Found {len(vendors)} eligible event-service options across categories."))
            budget_summary = self.budget_agent.event_bundle(vendors, intent.get("budget_max"), intent.get("people"))
            steps.append(AgentStep(agent="Budget Agent", summary="Built a multi-merchant bundle and checked it against the total budget."))
            for item in budget_summary.get("selected_vendors", []):
                recommendations.append(Recommendation(
                    id=item["id"], name=item["name"], merchant=item["name"], price=item["price"],
                    score=item.get("rating", 4.0) * 20, reasons=[f"Selected for {item['category']}", "Best-value eligible option in demo catalogue"],
                    metadata={"category": item["category"]}
                ))
            next_action = "Review the multi-merchant plan and approve before any transaction is created."

        elif mission_type == "merchant_intelligence":
            budget_summary = self.merchant_agent.run()
            steps.append(AgentStep(agent="Merchant Intelligence Agent", summary="Mapped revenue leakage and ranked the highest-value recovery opportunities."))
            next_action = "Review the ranked recovery actions and choose one to test."

        else:
            steps.append(AgentStep(agent="Mission Orchestrator", summary="Prepared a general commerce mission and identified missing integration requirements."))
            next_action = "Refine the request with a product, service, budget or merchant goal."

        world.record("mission_prepared", {"mission_id": mission_id, "mission_type": mission_type})
        return MissionResponse(
            mission_id=mission_id,
            mission_type=mission_type,
            intent=intent,
            plan=plan,
            steps=steps,
            recommendations=recommendations,
            budget_summary=budget_summary,
            requires_payment_confirmation=True,
            next_action=next_action,
        )
