"""Mock support-assistant ChatPort: answers from the tenant FAQ; refuses transactional asks."""

from __future__ import annotations

import re

from ...ports.chat import ChatReply, FaqEntry
from .base import MockAdapterBase

# The assistant is help-only; requests to move money or make bookings are refused (guardrail).
_TRANSACTIONAL = {
    "transfer",
    "redeem",
    "book",
    "booking",
    "cashout",
    "withdraw",
    "deposit",
    "fund",
    "pay",
    "payment",
    "buy",
}


def _tokens(text: str) -> set[str]:
    return {w for w in re.findall(r"\w+", text.lower()) if len(w) > 3}


class MockChatAdapter(MockAdapterBase):
    async def answer(self, *, message: str, faqs: list[FaqEntry], history: list[str]) -> ChatReply:
        await self._simulate()
        lowered = message.lower()
        if any(word in lowered for word in _TRANSACTIONAL):
            return ChatReply(
                text=(
                    "I'm a help assistant and can't perform account, booking or money actions. "
                    "Please use the relevant screen in the app for that."
                ),
                confidence=1.0,
                escalate=False,
                refused=True,
            )

        words = _tokens(message)
        best: FaqEntry | None = None
        best_score = 0
        for faq in faqs:
            score = len(words & _tokens(faq.question))
            if score > best_score:
                best, best_score = faq, score

        if best is not None and best_score > 0:
            return ChatReply(text=best.answer, confidence=0.9, escalate=False, refused=False)

        return ChatReply(
            text="I'm not sure about that — let me connect you with our support team.",
            confidence=0.2,
            escalate=True,
            refused=False,
        )
