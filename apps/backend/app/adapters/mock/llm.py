"""Mock LlmPort — deterministic scripted narration from structured scores (offline demo).

The orchestrator sends one user message whose content is a JSON context document (use_case,
fit_score, chips, degraded sources, …). This mock renders it through fixed templates, which is
exactly the "LLM narrates, never computes" contract — the numbers all come in from scoring.
"""

from __future__ import annotations

import json
from typing import Any

from ...ports.llm import LlmCompletion, LlmMessage
from .base import MockAdapterBase


def _chips(context: dict[str, Any], limit: int = 3) -> str:
    chips = [str(c) for c in context.get("chips", [])][:limit]
    return "; ".join(chips) if chips else "your profile"


def _degraded_suffix(context: dict[str, Any]) -> str:
    degraded = context.get("degraded") or []
    if not degraded:
        return ""
    pretty = ", ".join(str(d).split(".")[0].replace("_", " ") for d in degraded)
    return f" (Couldn't reach {pretty} — here's what I know without it.)"


class MockLlmAdapter(MockAdapterBase):
    async def complete(
        self,
        *,
        system: str,
        messages: list[LlmMessage],
        temperature: float = 0.3,
        max_tokens: int = 500,
    ) -> LlmCompletion:
        await self._simulate()
        try:
            context: dict[str, Any] = json.loads(messages[-1].content)
        except (ValueError, IndexError):
            context = {}
        use_case = context.get("use_case", "brief")
        persona = context.get("persona_name", "your concierge")
        fit = context.get("fit_score")

        if use_case == "brief":
            if fit is None:
                text = f"Here's what's on at {context.get('tenant_name', 'the resort')} today."
            elif fit >= 70:
                text = f"It's a great day to visit — {_chips(context)}."
            elif fit >= 40:
                text = f"A solid day for a visit — {_chips(context)}."
            else:
                text = f"Today's a quieter fit — {_chips(context)}."
        elif use_case == "offers":
            titles = [str(t) for t in context.get("offer_titles", [])][:2]
            text = (
                f"Your top picks: {' and '.join(titles)}." if titles else "No offers right now."
            )
        elif use_case == "plan":
            leave = context.get("leave_time", "this evening")
            stops = [str(s) for s in context.get("stops", [])][:3]
            text = f"Leave around {leave}" + (
                f", then {', '.join(stops)}." if stops else " and enjoy the evening."
            )
        else:  # ask
            text = f"{persona} here — based on {_chips(context)}, " + str(
                context.get("headline", "here's what I found.")
            )
        return LlmCompletion(text=text + _degraded_suffix(context), model="mock-scripted")
