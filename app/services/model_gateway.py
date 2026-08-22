from __future__ import annotations

from typing import Any
import httpx

from app.config import get_settings


class ModelGateway:
    """Provider-agnostic text/vision gateway.

    Configure LLM_ENDPOINT to an HTTPS endpoint that accepts a chat-style JSON
    body with `model` and `messages`. The response parser supports several common
    shapes so Nexora is not tied to one model vendor.
    """

    def __init__(self) -> None:
        self.settings = get_settings()

    @property
    def configured(self) -> bool:
        return bool(self.settings.llm_endpoint)

    async def generate(
        self,
        messages: list[dict[str, Any]],
        *,
        temperature: float = 0.35,
        max_tokens: int = 1800,
    ) -> str | None:
        if not self.configured:
            return None

        headers = {"Content-Type": "application/json"}
        if self.settings.llm_api_key:
            headers["Authorization"] = f"Bearer {self.settings.llm_api_key}"

        payload: dict[str, Any] = {
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if self.settings.llm_model:
            payload["model"] = self.settings.llm_model

        try:
            async with httpx.AsyncClient(timeout=45) as client:
                response = await client.post(self.settings.llm_endpoint, headers=headers, json=payload)
                response.raise_for_status()
                data = response.json()
        except Exception:
            return None

        return self._extract_text(data)

    @staticmethod
    def _extract_text(data: Any) -> str | None:
        if isinstance(data, str):
            return data.strip() or None
        if not isinstance(data, dict):
            return None

        for key in ("output_text", "answer", "text", "response", "content"):
            value = data.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()

        choices = data.get("choices")
        if isinstance(choices, list) and choices:
            first = choices[0]
            if isinstance(first, dict):
                message = first.get("message")
                if isinstance(message, dict):
                    content = message.get("content")
                    if isinstance(content, str) and content.strip():
                        return content.strip()
                    if isinstance(content, list):
                        chunks: list[str] = []
                        for part in content:
                            if isinstance(part, dict) and isinstance(part.get("text"), str):
                                chunks.append(part["text"])
                        if chunks:
                            return "\n".join(chunks).strip()
                text = first.get("text")
                if isinstance(text, str) and text.strip():
                    return text.strip()

        output = data.get("output")
        if isinstance(output, list):
            chunks: list[str] = []
            for item in output:
                if not isinstance(item, dict):
                    continue
                content = item.get("content")
                if isinstance(content, list):
                    for part in content:
                        if isinstance(part, dict) and isinstance(part.get("text"), str):
                            chunks.append(part["text"])
            if chunks:
                return "\n".join(chunks).strip()

        return None
