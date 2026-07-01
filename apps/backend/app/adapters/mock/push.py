"""In-memory mock PushPort. Delivers to registered devices; unknown players are 'not delivered'."""

from __future__ import annotations

from ...ports.push import Platform, PushNotification, PushReceipt
from .base import MockAdapterBase


class MockPushAdapter(MockAdapterBase):
    def _init_state(self) -> None:
        # player_ref -> list of (token, platform)
        self._devices: dict[str, list[tuple[str, Platform]]] = {}

    async def register_device(self, player_ref: str, device_token: str, platform: Platform) -> None:
        await self._simulate()
        self._devices.setdefault(player_ref, []).append((device_token, platform))

    async def send(self, player_ref: str, notification: PushNotification) -> PushReceipt:
        await self._simulate()
        delivered = bool(self._devices.get(player_ref))
        return PushReceipt(id=self._new_id(), player_ref=player_ref, delivered=delivered)

    async def send_bulk(
        self, player_refs: list[str], notification: PushNotification
    ) -> list[PushReceipt]:
        await self._simulate()
        return [
            PushReceipt(
                id=self._new_id(),
                player_ref=ref,
                delivered=bool(self._devices.get(ref)),
            )
            for ref in player_refs
        ]
