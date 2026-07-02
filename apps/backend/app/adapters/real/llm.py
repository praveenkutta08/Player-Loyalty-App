"""Real LlmPort — Claude via the Anthropic Messages API (selected by LLM_PROVIDER=real)."""

from __future__ import annotations

import httpx

from ...core.settings import get_settings
from ...ports.errors import AdapterUnavailableError
from ...ports.llm import LlmCompletion, LlmMessage

BASE_URL = "https://api.anthropic.com/v1/messages"
API_VERSION = "2023-06-01"


class AnthropicLlmAdapter:
    def __init__(self, *, timeout_s: float = 30.0) -> None:
        self._timeout_s = timeout_s

    async def complete(
        self,
        *,
        system: str,
        messages: list[LlmMessage],
        temperature: float = 0.3,
        max_tokens: int = 500,
    ) -> LlmCompletion:
        settings = get_settings()
        if not settings.anthropic_api_key:
            raise AdapterUnavailableError("anthropic: ANTHROPIC_API_KEY is not configured")
        payload = {
            "model": settings.llm_model,
            "system": system,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        try:
            async with httpx.AsyncClient(timeout=self._timeout_s) as client:
                response = await client.post(
                    BASE_URL,
                    json=payload,
                    headers={
                        "x-api-key": settings.anthropic_api_key,
                        "anthropic-version": API_VERSION,
                    },
                )
                response.raise_for_status()
                data = response.json()
        except httpx.HTTPError as exc:
            raise AdapterUnavailableError(f"anthropic: {exc}") from exc
        try:
            text = "".join(
                block["text"] for block in data["content"] if block.get("type") == "text"
            )
        except (KeyError, TypeError) as exc:
            raise AdapterUnavailableError(f"anthropic: malformed response ({exc})") from exc
        return LlmCompletion(text=text, model=str(data.get("model", settings.llm_model)))
