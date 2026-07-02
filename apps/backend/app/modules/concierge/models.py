"""Concierge data model: properties + player preferences (P6.1) and the append-only
``concierge_answers`` audit/metrics table (P6.3).

All tenant-owned (RLS). ``properties`` enables drive-time math and the later multi-property
comparison; ``player_preferences`` feeds recommendation reasons ("your favorite steakhouse");
``concierge_answers`` records every AI answer (inputs hash, tools called, scores, output) —
golden rule #8, and the eval dataset later.
"""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import Float, ForeignKey, String, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import BaseModel, TenantOwnedMixin


class Property(TenantOwnedMixin, BaseModel):
    """A tenant venue/resort location (lat/lng anchors weather + travel context)."""

    __tablename__ = "properties"
    __table_args__ = (UniqueConstraint("tenant_id", "name", name="uq_properties_tenant_id_name"),)

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)
    # Free-form amenity tags, e.g. ["steakhouse", "spa", "pool", "poker_room"].
    amenities: Mapped[list[Any]] = mapped_column(
        JSONB, nullable=False, default=list, server_default="[]"
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="active", server_default="active"
    )


class PlayerPreference(TenantOwnedMixin, BaseModel):
    """One row per player: favorite property / dining / experiences."""

    __tablename__ = "player_preferences"
    __table_args__ = (
        UniqueConstraint("tenant_id", "player_id", name="uq_player_preferences_tenant_id_player"),
    )

    player_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("players.id", ondelete="CASCADE"), nullable=False
    )
    favorite_property_id: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("properties.id", ondelete="SET NULL"), nullable=True
    )
    favorite_dining: Mapped[str | None] = mapped_column(String(120), nullable=True)
    # Ordered list of experience tags, e.g. ["slots", "steakhouse", "shows"].
    favorite_experiences: Mapped[list[Any]] = mapped_column(
        JSONB, nullable=False, default=list, server_default="[]"
    )


class ConciergeAnswer(TenantOwnedMixin, BaseModel):
    """Append-only record of every concierge answer (immutability enforced by DB trigger)."""

    __tablename__ = "concierge_answers"

    player_id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), nullable=False, index=True)
    use_case: Mapped[str] = mapped_column(String(20), nullable=False)  # brief|offers|plan|ask
    inputs_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    tools_called: Mapped[list[Any]] = mapped_column(
        JSONB, nullable=False, default=list, server_default="[]"
    )
    scores: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb")
    )
    output: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb")
    )
