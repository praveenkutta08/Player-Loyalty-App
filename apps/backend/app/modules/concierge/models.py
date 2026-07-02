"""Concierge data model (P6.1): properties and player preferences.

Both tenant-owned (RLS). ``properties`` enables drive-time math and the later multi-property
comparison; ``player_preferences`` feeds recommendation reasons ("your favorite steakhouse").
The append-only ``concierge_answers`` audit table lands with the orchestrator (P6.3).
"""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import Float, ForeignKey, String, UniqueConstraint
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
