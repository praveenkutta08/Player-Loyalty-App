"""In-memory mock DigitalKeyPort."""

from __future__ import annotations

from datetime import UTC, datetime

from ...ports.digital_key import DigitalKey, DigitalKeyStatus, UnlockResult
from ...ports.errors import AdapterNotFoundError, AdapterRejectedError
from .base import MockAdapterBase


class MockDigitalKeyAdapter(MockAdapterBase):
    def _init_state(self) -> None:
        self._keys: dict[str, DigitalKey] = {}

    async def issue_key(self, reservation_ref: str, player_ref: str, room: str) -> DigitalKey:
        await self._simulate()
        key = DigitalKey(
            id=self._new_id(),
            player_ref=player_ref,
            reservation_ref=reservation_ref,
            room=room,
            status=DigitalKeyStatus.active,
        )
        self._keys[key.id] = key
        return key

    async def list_keys(self, player_ref: str) -> list[DigitalKey]:
        await self._simulate()
        return [k for k in self._keys.values() if k.player_ref == player_ref]

    async def unlock(self, key_id: str, door_id: str) -> UnlockResult:
        await self._simulate()
        key = self._keys.get(key_id)
        if key is None:
            raise AdapterNotFoundError(f"unknown key {key_id}")
        if key.status is not DigitalKeyStatus.active:
            raise AdapterRejectedError("key is revoked", code="revoked")
        return UnlockResult(key_id=key_id, door_id=door_id, unlocked=True, at=datetime.now(UTC))

    async def revoke(self, key_id: str) -> None:
        await self._simulate()
        key = self._keys.get(key_id)
        if key is None:
            raise AdapterNotFoundError(f"unknown key {key_id}")
        self._keys[key_id] = DigitalKey(
            id=key.id,
            player_ref=key.player_ref,
            reservation_ref=key.reservation_ref,
            room=key.room,
            status=DigitalKeyStatus.revoked,
        )
