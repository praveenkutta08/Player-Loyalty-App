"""ChatPort — the support assistant LLM (mock in MVP; real provider by env).

Help/FAQ answers only. The port never performs transactional actions; the reply signals whether
the assistant refused a transactional request and whether the conversation should escalate.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol, runtime_checkable


@dataclass(frozen=True)
class FaqEntry:
    question: str
    answer: str


@dataclass(frozen=True)
class ChatReply:
    text: str
    confidence: float
    escalate: bool
    refused: bool


@runtime_checkable
class ChatPort(Protocol):
    async def answer(
        self, *, message: str, faqs: list[FaqEntry], history: list[str]
    ) -> ChatReply: ...
