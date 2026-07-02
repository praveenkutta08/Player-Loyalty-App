"""Pydantic schemas for player auth + admin responsible-gaming controls."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator


class PlayerLoginRequest(BaseModel):
    email: EmailStr
    password: str


class PlayerOtpRequest(BaseModel):
    email: EmailStr


class PlayerOtpVerify(BaseModel):
    email: EmailStr
    code: str


class PlayerMeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    email: str
    status: str
    # Server-persisted consents — the app hydrates its local toggles from these on launch (H7).
    location_consent: bool = False


class RgFlagsUpdate(BaseModel):
    """Full desired RG state for a player (audit H2). An all-clear body removes every flag.

    The stored shape matches what the concierge guardrail reads
    (``concierge/service.py::rg_restriction``): ``self_exclusion`` bool, ``cool_off_until``
    ISO datetime, ``limits`` mapping.
    """

    self_exclusion: bool = False
    cool_off_until: datetime | None = None
    limits: dict[str, int] | None = None

    @field_validator("cool_off_until")
    @classmethod
    def _cool_off_must_be_future(cls, value: datetime | None) -> datetime | None:
        if value is not None:
            aware = value if value.tzinfo else value.replace(tzinfo=UTC)
            if aware <= datetime.now(UTC):
                raise ValueError("cool_off_until must be in the future")
        return value

    def to_flags(self) -> dict[str, object] | None:
        flags: dict[str, object] = {}
        if self.self_exclusion:
            flags["self_exclusion"] = True
        if self.cool_off_until is not None:
            aware = (
                self.cool_off_until
                if self.cool_off_until.tzinfo
                else self.cool_off_until.replace(tzinfo=UTC)
            )
            flags["cool_off_until"] = aware.isoformat()
        if self.limits:
            flags["limits"] = self.limits
        return flags or None


class PlayerRgOut(BaseModel):
    """Admin view of a player's responsible-gaming state."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    status: str
    rg_flags: dict[str, object] | None = None
