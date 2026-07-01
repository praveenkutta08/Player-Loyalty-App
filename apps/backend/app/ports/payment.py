"""PaymentPort — payment provider (intent/capture/refund).

Money-moving methods take an ``idempotency_key`` (GOLDEN RULE #4).
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum
from typing import Protocol, runtime_checkable

from .types import Money


class PaymentStatus(StrEnum):
    requires_capture = "requires_capture"
    succeeded = "succeeded"
    failed = "failed"
    refunded = "refunded"


@dataclass(frozen=True)
class PaymentIntent:
    id: str
    amount: Money
    status: PaymentStatus
    idempotency_key: str


@dataclass(frozen=True)
class PaymentResult:
    intent_id: str
    status: PaymentStatus
    amount: Money


@runtime_checkable
class PaymentPort(Protocol):
    async def create_intent(
        self, amount: Money, player_ref: str, idempotency_key: str
    ) -> PaymentIntent: ...

    async def capture(self, intent_id: str, idempotency_key: str) -> PaymentResult: ...

    async def refund(
        self, intent_id: str, amount: Money, idempotency_key: str
    ) -> PaymentResult: ...

    async def get_status(self, intent_id: str) -> PaymentStatus: ...
