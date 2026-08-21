from dataclasses import dataclass
from .action_wallet import ActionWallet
from .policy_engine import PolicyEngine, PolicyDecision


@dataclass
class ActionRequest:
    agent_id: str
    action: str
    amount: int = 0
    merchant: str = ""
    purpose: str = ""


class AgentFirewall:
    def __init__(self) -> None:
        self.policy = PolicyEngine()

    def inspect(self, request: ActionRequest, wallet: ActionWallet) -> PolicyDecision:
        if not request.agent_id.startswith("nexora-"):
            return PolicyDecision(False, False, "Unknown agent identity.")
        if request.action == "payment":
            if not request.merchant:
                return PolicyDecision(False, False, "Merchant identity is required.")
            if not request.purpose:
                return PolicyDecision(False, False, "Transaction purpose is required.")
            return self.policy.evaluate_payment(request.amount, wallet)
        return PolicyDecision(True, False, "Action permitted.")
