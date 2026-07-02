"""LlmPort — concierge narration (P6.3). Separate from the support ChatPort on purpose:
different guardrails, different prompt audience. The LLM NARRATES structured scores; it never
computes numbers or invents offers/terms (enforced by prompt + the mock's template behaviour)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol, runtime_checkable


@dataclass(frozen=True)
class LlmMessage:
    role: str  # "user" | "assistant"
    content: str


@dataclass(frozen=True)
class LlmCompletion:
    text: str
    model: str


@runtime_checkable
class LlmPort(Protocol):
    async def complete(
        self,
        *,
        system: str,
        messages: list[LlmMessage],
        temperature: float = 0.3,
        max_tokens: int = 500,
    ) -> LlmCompletion: ...
