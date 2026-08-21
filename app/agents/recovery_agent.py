class RecoveryAgent:
    name = "Recovery Agent"

    def run(self, failure_type: str) -> dict:
        playbook = {
            "payment_timeout": "Preserve cart state and offer a safe retry after checking transaction status.",
            "inventory_change": "Re-run discovery with original constraints and present the closest in-stock alternative.",
            "offer_invalid": "Remove the invalid offer and recompute the best compliant price.",
        }
        return {"failure_type": failure_type, "action": playbook.get(failure_type, "Escalate for manual review with mission context preserved.")}
