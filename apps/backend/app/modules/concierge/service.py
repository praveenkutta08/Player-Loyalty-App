"""Concierge configuration access (P6.2). The orchestrator lands in P6.3."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from ..tenant_config.service import get_config
from .scoring import ScoreWeights

# Default persona/guardrails; tenants override via Concierge Studio (P6.4). "Aria" is only the
# seed default — persona is manifest/tenant config, never hardcoded in the app (golden rule #5).
DEFAULT_CONCIERGE_CONFIG: dict[str, Any] = {
    "persona": {"name": "Aria", "tone": "warm", "accent_token": "gold"},
    "weights": {
        "value_at_risk": 0.35,
        "weather_fit": 0.25,
        "travel_fit": 0.20,
        "tier_urgency": 0.20,
    },
    "guardrails": {"quiet_hours_start": 22, "quiet_hours_end": 8, "frequency_cap_per_day": 3},
}


async def get_concierge_config(session: AsyncSession, tenant_id: UUID) -> dict[str, Any]:
    """Tenant concierge config with defaults deep-filled for missing sections."""
    config = await get_config(session, tenant_id)
    stored: dict[str, Any] = dict(config.concierge or {}) if config else {}
    merged = {
        key: {**default, **stored.get(key, {})}
        for key, default in DEFAULT_CONCIERGE_CONFIG.items()
    }
    return merged


async def get_weights(session: AsyncSession, tenant_id: UUID) -> ScoreWeights:
    config = await get_concierge_config(session, tenant_id)
    return ScoreWeights.from_config(config.get("weights"))
