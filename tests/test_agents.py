from app.agents.intent_agent import IntentAgent
from app.agents.orchestrator import MasterOrchestrator


def test_laptop_intent_extracts_budget():
    intent = IntentAgent().run("Find me a laptop below ₹70,000 for AI and coding")
    assert intent["mission_type"] == "product_purchase"
    assert intent["budget_max"] == 70000
    assert "ai" in intent["preferences"]


def test_laptop_mission_returns_recommendations():
    mission = MasterOrchestrator().run("Find me the best laptop below ₹70,000 for AI and coding", "test-user")
    assert mission.mission_type == "product_purchase"
    assert len(mission.recommendations) >= 1
    assert mission.recommendations[0].price <= 70000
    assert mission.requires_payment_confirmation is True


def test_event_mission_respects_budget_when_possible():
    mission = MasterOrchestrator().run("Arrange a birthday for 25 people under ₹20,000", "test-user")
    assert mission.mission_type == "multi_merchant_event"
    assert mission.budget_summary["total"] <= 20000


def test_merchant_mission_contains_leakage():
    mission = MasterOrchestrator().run("Why is my merchant revenue leaking today?", "test-user")
    assert mission.mission_type == "merchant_intelligence"
    assert mission.budget_summary["leakage"] > 0
