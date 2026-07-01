"""KycPort — identity verification provider."""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum
from typing import Protocol, runtime_checkable


class KycStatus(StrEnum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    review = "review"


@dataclass(frozen=True)
class KycSession:
    id: str
    player_ref: str
    status: KycStatus


@runtime_checkable
class KycPort(Protocol):
    async def start_verification(
        self, player_ref: str, full_name: str, document_ref: str
    ) -> KycSession: ...

    async def get_status(self, session_id: str) -> KycSession: ...
