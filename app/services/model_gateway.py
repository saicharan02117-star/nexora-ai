from __future__ import annotations

import os
from typing import Any

import httpx

from app.config import get_settings


class ModelGateway:
    """Provider-agnostic general intelligence gateway.

    On Vercel, Nexora can authenticate to AI Gateway using VERCEL_OIDC_TOKEN.
    A custom LLM_ENDPOINT / LLM_API_KEY / LLM_MODEL can override the defaults.
    """

    DEFAULT_ENDPOINT = "https://ai-gateway.vercel.sh/v1/chat/completions"
    DEFAULT_MODEL = "anthropic/claude-sonnet-5"

    def __init__(self) -> None:
        self.settings = get_settings()

    @property
    def endpoint(self) -> str:
        return (self.settings.llm_endpoint or self.DEFAULT_ENDPOINT).strip()

    @property
    def model(self) -> str:
        return (self.settings.llm_model or self.DEFAULT_MODEL).strip()

    @property
    def api_key(self) -> str:
        return (
            self.settings.llm_api_key
            or os.getenv("AI_GATEWAY_API_KEY", "")
            or os.getenv("VERCEL_OIDC_TOKEN", "")
        ).strip()

    @property
    def configured(self) -> bool:
        return bool(self.endpoint and self.api_key and self.model)

    async def generate(
        self,
        messages: list[dict[str, Any]],
        *,
        temperature: float = 0.35,
        max_tokens: int = 2200,
    ) -> str | None:
        if not self.configured:
            return None

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        try:
            async with httpx.AsyncClient(timeout=50) as client:
                response = await client.post(self.endpoint, headers=headers, json=payload)
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
