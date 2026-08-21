from dataclasses import dataclass
from .action_wallet import ActionWallet


@dataclass
class PolicyDecision:
    allowed: bool
    requires_confirmation: bool
    reason: str


class PolicyEngine:
    def evaluate_payment(self, amount: int, wallet: ActionWallet) -> PolicyDecision:
        if amount <= 0:
            return PolicyDecision(False, False, "Amount must be positive.")
        if amount > wallet.maximum_transaction:
            return PolicyDecision(False, False, "Transaction exceeds configured spending limit.")
        if not wallet.execute_payment:
            return PolicyDecision(True, True, "Payment execution requires explicit user approval.")
        return PolicyDecision(True, wallet.payment_requires_confirmation, "Payment is within configured policy.")
