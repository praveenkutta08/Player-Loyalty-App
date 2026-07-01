"""DigitalKeyPort — hotel digital room keys (issue/list/unlock/revoke)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum
from typing import Protocol, runtime_checkable


class DigitalKeyStatus(StrEnum):
    active = "active"
    revoked = "revoked"


@dataclass(frozen=True)
class DigitalKey:
    id: str
    player_ref: str
    reservation_ref: str
    room: str
    status: DigitalKeyStatus


@dataclass(frozen=True)
class UnlockResult:
    key_id: str
    door_id: str
    unlocked: bool
    at: datetime


@runtime_checkable
class DigitalKeyPort(Protocol):
    async def issue_key(self, reservation_ref: str, player_ref: str, room: str) -> DigitalKey: ...

    async def list_keys(self, player_ref: str) -> list[DigitalKey]: ...

    async def unlock(self, key_id: str, door_id: str) -> UnlockResult: ...

    async def revoke(self, key_id: str) -> None: ...
