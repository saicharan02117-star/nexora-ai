from app.security.action_wallet import ActionWallet
from app.security.agent_firewall import AgentFirewall, ActionRequest


def test_payment_requires_confirmation_by_default():
    wallet = ActionWallet()
    result = AgentFirewall().inspect(ActionRequest(
        agent_id="nexora-payment-agent",
        action="payment",
        amount=1000,
        merchant="Demo Merchant",
        purpose="Demo purchase",
    ), wallet)
    assert result.allowed is True
    assert result.requires_confirmation is True


def test_payment_over_limit_is_blocked():
    wallet = ActionWallet(maximum_transaction=5000)
    result = AgentFirewall().inspect(ActionRequest(
        agent_id="nexora-payment-agent",
        action="payment",
        amount=9000,
        merchant="Demo Merchant",
        purpose="Demo purchase",
    ), wallet)
    assert result.allowed is False
