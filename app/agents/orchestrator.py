from uuid import uuid4
from app.schemas import MissionResponse, AgentStep, Recommendation
from app.world_model.state import CommerceWorldModel
from app.security.action_wallet import DEFAULT_WALLET
from app.security.agent_firewall import AgentFirewall, ActionRequest
from app.services.market_enrichment import enrich_product
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

    @staticmethod
    def _metadata(item: dict) -> dict:
        preferred = [
            "cpu", "ram_gb", "storage_gb", "gpu", "delivery_days", "rating",
            "style", "material", "sizes", "display", "memory", "battery",
            "camera", "feature", "capacity", "color", "finish", "dimensions",
            "warranty", "connectivity", "platform", "edition", "compatibility",
            "brand", "brand_origin", "source_note"
        ]
        data = {}
        for key in preferred:
            if key in item:
                label = key.replace("_", " ").title()
                value = item[key]
                if key == "ram_gb":
                    value = f"{value}GB"
                elif key == "storage_gb":
                    value = f"{value}GB SSD"
                elif key == "delivery_days":
                    value = f"{value} day(s)"
                data[label] = value
        return data

    @staticmethod
    def _merge_followup(intent: dict, previous_intent: dict | None, message: str) -> tuple[dict, bool]:
        """Carry the previous product/service into short follow-up messages.

        Examples:
        - "slippers" -> "in budget of 1500"
        - "show laptops" -> "under 60000"
        - "find a chair" -> "make it plastic"
        """
        if not previous_intent:
            return intent, False

        prev_type = previous_intent.get("mission_type")
        if prev_type not in {"product_purchase", "multi_merchant_event"}:
            return intent, False

        text = (message or "").lower().strip()
        followup_cues = [
            "budget", "under", "below", "within", "up to", "upto", "less than",
            "cheaper", "costlier", "premium", "another", "more options", "same",
            "indian", "foreign", "international", "brand", "size", "colour", "color",
            "plastic", "metal", "steel", "wood", "wooden", "soft", "hard",
            "fast delivery", "delivery", "rating", "better", "best one", "this one",
        ]
        cue_present = any(cue in text for cue in followup_cues)
        current_is_general = intent.get("mission_type") == "general_commerce"

        # A short numeric/budget-only message is almost always a refinement of the last mission.
        compact_followup = len(text.split()) <= 8 and (intent.get("budget_max") is not None or cue_present)

        if not (current_is_general or compact_followup):
            return intent, False

        merged = dict(previous_intent)
        merged["raw_goal"] = message.strip()
        merged["payment_requires_confirmation"] = True

        if intent.get("budget_max") is not None:
            merged["budget_max"] = intent["budget_max"]
        if intent.get("people") is not None:
            merged["people"] = intent["people"]

        current_preferences = intent.get("preferences") or []
        previous_preferences = merged.get("preferences") or []
        merged["preferences"] = list(dict.fromkeys(previous_preferences + current_preferences))

        # Preserve the original product/event unless the new message clearly names a new canonical category.
        if intent.get("mission_type") == prev_type and intent.get("category") not in {None, "general", "product"}:
            category = intent.get("category")
            product_query = intent.get("product_query")
            # Constraint-like arbitrary phrases should not replace the previous product.
            constraint_phrases = {
                "indian", "indian only", "foreign", "international", "premium", "cheaper",
                "another", "another option", "more options", "budget", "plastic", "metal",
                "steel", "wood", "wooden", "soft", "hard"
            }
            if str(product_query or "").strip().lower() not in constraint_phrases:
                merged["category"] = category
                if product_query:
                    merged["product_query"] = product_query

        return merged, True

    def run(self, message: str, user_id: str, previous_intent: dict | None = None) -> MissionResponse:
        mission_id = f"NX-{uuid4().hex[:8].upper()}"
        world = CommerceWorldModel(user_id=user_id)
        intent = self.intent_agent.run(message)
        intent, used_context = self._merge_followup(intent, previous_intent, message)
        world.intent = intent
        world.record("intent_understood", intent)
        plan = self.planner_agent.run(intent)

        steps = [
            AgentStep(agent="Intent Agent", summary="Converted the request into structured goals and constraints."),
        ]
        if used_context:
            steps.append(AgentStep(
                agent="Conversation Memory",
                summary="Applied this follow-up to the previous shopping mission instead of treating it as a new unrelated request.",
            ))
        steps.append(AgentStep(agent="Planner Agent", summary=f"Created an executable {len(plan)}-step mission plan."))

        mission_type = intent["mission_type"]
        recommendations: list[Recommendation] = []
        budget_summary: dict = {}
        next_action = "Review the plan."

        if mission_type == "product_purchase":
            discovered = self.discovery_agent.run(intent)
            query = intent.get("product_query") or intent.get("category") or "product"
            is_universal_demo = bool(discovered) and all(item.get("synthetic_demo") for item in discovered)
            if is_universal_demo:
                steps.append(AgentStep(
                    agent="Universal Product Router",
                    summary=f"No exact demo SKU existed for '{query}', so Nexora prepared representative offline prototype options instead of rejecting the request.",
                ))
            else:
                steps.append(AgentStep(
                    agent="Discovery Agent",
                    summary=f"Searched the connected demo catalogue for '{query}' and found {len(discovered)} eligible in-stock matches.",
                ))

            ranked = self.comparison_agent.run(discovered, intent)
            steps.append(AgentStep(agent="Comparison Agent", summary="Ranked available matches using budget, requested attributes, delivery and merchant signals."))

            if ranked and not ranked[0].get("synthetic_demo"):
                offer = self.negotiation_agent.run(ranked[0])
                ranked[0]["original_price"] = ranked[0]["price"]
                ranked[0]["price"] = offer["final_price"]
                if offer["discount"]:
                    ranked[0]["reasons"] = [f"₹{offer['discount']} demo merchant-authorized offer applied"] + ranked[0]["reasons"]
                steps.append(AgentStep(agent="Negotiation Agent", summary=offer["policy"]))

            enriched_ranked = [enrich_product(item, query, index=i) for i, item in enumerate(ranked)]

            for item in enriched_ranked:
                recommendations.append(Recommendation(
                    id=item["id"],
                    name=item["name"],
                    merchant=item["merchant"],
                    price=item["price"],
                    score=item["score"],
                    reasons=item["reasons"],
                    metadata=self._metadata(item),
                    image_url=item.get("image_url"),
                    image_label=item.get("image_label"),
                    image_search_url=item.get("image_search_url"),
                    local_market_range=item.get("local_market_range"),
                    price_label=item.get("price_label"),
                    price_note=item.get("price_note"),
                    buy_links=item.get("buy_links", {}),
                    nearby_link=item.get("nearby_link"),
                ))

            budget_summary = self.budget_agent.product_summary(enriched_ranked, intent.get("budget_max"))
            if enriched_ranked:
                firewall = self.firewall.inspect(ActionRequest(
                    agent_id="nexora-payment-agent",
                    action="payment",
                    amount=enriched_ranked[0]["price"],
                    merchant=enriched_ranked[0]["merchant"],
                    purpose=intent["raw_goal"],
                ), DEFAULT_WALLET)
                steps.append(AgentStep(
                    agent="Agent Firewall",
                    status="needs_confirmation" if firewall.requires_confirmation else "completed",
                    summary=firewall.reason,
                ))
                if used_context and intent.get("budget_max"):
                    next_action = (
                        f"Updated the previous {query} search to a ₹{intent['budget_max']:,} budget and reranked the options. "
                        "Review the refreshed recommendations before checkout."
                    )
                elif enriched_ranked[0].get("synthetic_demo"):
                    next_action = (
                        f"Prepared an offline prototype estimate for '{query}'. The card includes a direct illustrated preview, local-market estimate and shopping links."
                    )
                else:
                    next_action = (
                        f"Best demo-catalogue match: {enriched_ranked[0]['name']} at ₹{enriched_ranked[0]['price']:,}. "
                        "Review the market range and shopping links before checkout."
                    )
            else:
                next_action = f"I understood the request for '{query}', but could not prepare a prototype option."

        elif mission_type == "multi_merchant_event":
            vendors = self.discovery_agent.run(intent)
            steps.append(AgentStep(agent="Discovery Agent", summary=f"Found {len(vendors)} eligible event-service options across categories."))
            budget_summary = self.budget_agent.event_bundle(vendors, intent.get("budget_max"), intent.get("people"))
            steps.append(AgentStep(agent="Budget Agent", summary="Built a multi-merchant bundle and checked it against the total budget."))
            for item in budget_summary.get("selected_vendors", []):
                recommendations.append(Recommendation(
                    id=item["id"], name=item["name"], merchant=item["name"], price=item["price"],
                    score=item.get("rating", 4.0) * 20,
                    reasons=[f"Selected for {item['category']}", "Best-value eligible option in demo catalogue"],
                    metadata={"Category": item["category"]},
                ))
            next_action = "Review the multi-merchant plan and approve before any transaction is created."

        elif mission_type == "merchant_intelligence":
            budget_summary = self.merchant_agent.run()
            steps.append(AgentStep(agent="Merchant Intelligence Agent", summary="Mapped revenue leakage and ranked the highest-value recovery opportunities."))
            next_action = "Review the ranked recovery actions and choose one to test."

        else:
            steps.append(AgentStep(agent="Mission Orchestrator", summary="The request does not yet map to a transactional commerce action."))
            next_action = "Ask Nexora to find, compare, buy or plan a product/service, or ask a merchant growth question."

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
