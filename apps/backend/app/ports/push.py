"""PushPort — push notification provider (device registration + send)."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum
from typing import Protocol, runtime_checkable


class Platform(StrEnum):
    ios = "ios"
    android = "android"


@dataclass(frozen=True)
class PushNotification:
    title: str
    body: str
    data: dict[str, str] = field(default_factory=dict)


@dataclass(frozen=True)
class PushReceipt:
    id: str
    player_ref: str
    delivered: bool


@runtime_checkable
class PushPort(Protocol):
    async def register_device(
        self, player_ref: str, device_token: str, platform: Platform
    ) -> None: ...

    async def send(self, player_ref: str, notification: PushNotification) -> PushReceipt: ...

    async def send_bulk(
        self, player_refs: list[str], notification: PushNotification
    ) -> list[PushReceipt]: ...
