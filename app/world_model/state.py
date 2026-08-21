from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


@dataclass
class CommerceWorldModel:
    user_id: str
    intent: dict[str, Any] = field(default_factory=dict)
    constraints: dict[str, Any] = field(default_factory=dict)
    selected_items: list[dict[str, Any]] = field(default_factory=list)
    transaction_state: dict[str, Any] = field(default_factory=dict)
    events: list[dict[str, Any]] = field(default_factory=list)

    def record(self, event: str, payload: dict[str, Any] | None = None) -> None:
        self.events.append(
            {
                "time": datetime.now(timezone.utc).isoformat(),
                "event": event,
                "payload": payload or {},
            }
        )
