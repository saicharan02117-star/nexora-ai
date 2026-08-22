from __future__ import annotations

from collections import defaultdict, deque
from typing import Any

from app.services.model_gateway import ModelGateway


class AssistantService:
    """General-purpose conversation layer for Nexora.

    Commerce requests continue to use Nexora's transactional agents. General
    questions can use a configured model endpoint with lightweight session memory.
    """

    SYSTEM_PROMPT = (
        "You are Nexora AI, a capable general-purpose assistant and transactional commerce copilot. "
        "Answer clearly, practically and conversationally. You can help with explanations, writing, "
        "coding, studying, planning, brainstorming, summarization, analysis and general questions. "
        "When a request is about buying, comparing products, merchant analytics or payments, state that "
        "Nexora's commerce engine can handle the transactional workflow. Do not invent live prices, stock, "
        "seller listings, sources or current facts. If live data is unavailable, say that briefly."
    )

    def __init__(self) -> None:
        self.gateway = ModelGateway()
        self._memory: dict[str, deque[dict[str, str]]] = defaultdict(lambda: deque(maxlen=16))

    @property
    def configured(self) -> bool:
        return self.gateway.configured

    def clear(self, session_id: str) -> None:
        self._memory.pop(session_id, None)

    async def respond(self, session_id: str, message: str) -> dict[str, Any]:
        history = list(self._memory[session_id])
        messages: list[dict[str, Any]] = [{"role": "system", "content": self.SYSTEM_PROMPT}]
        messages.extend(history)
        messages.append({"role": "user", "content": message})

        answer = await self.gateway.generate(messages)
        if not answer:
            answer = self._offline_fallback(message)
            mode = "offline"
        else:
            mode = "model"

        self._memory[session_id].append({"role": "user", "content": message})
        self._memory[session_id].append({"role": "assistant", "content": answer})
        return {"answer": answer, "mode": mode, "session_id": session_id}

    @staticmethod
    def _offline_fallback(message: str) -> str:
        text = message.strip()
        lower = text.lower()

        if any(x in lower for x in ["hello", "hi", "hey"]):
            return "Hi! I can help with questions, writing, coding, study help, planning, ideas and commerce tasks."
        if lower.startswith("summarize"):
            return "Send or paste the text you want summarized, and I’ll condense it into the key points."
        if any(x in lower for x in ["write an email", "write email", "draft email"]):
            return "Tell me who the email is for, the purpose, and the tone you want, and I’ll draft it."
        if any(x in lower for x in ["code", "python", "javascript", "java", "c++", "html"]):
            return "I can help with coding. Share the problem, error, or feature you want to build and I’ll work through it with you."
        if any(x in lower for x in ["explain", "what is", "how does", "why does"]):
            return "I can explain that, but this deployment currently needs a configured general-intelligence model endpoint for broad knowledge answers. Commerce workflows remain available now."
        return (
            "I understand your request. This deployment currently has the commerce engine active, while broad general-purpose answers require the configured model gateway. "
            "Once that endpoint is connected, this same chat can handle general Q&A, writing, coding, study help and multi-turn conversation alongside commerce."
        )
