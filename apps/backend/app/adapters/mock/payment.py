"""In-memory mock PaymentPort with idempotent intent creation."""

from __future__ import annotations

from ...ports.errors import AdapterNotFoundError, AdapterRejectedError
from ...ports.payment import PaymentIntent, PaymentResult, PaymentStatus
from ...ports.types import Money
from .base import MockAdapterBase


class MockPaymentAdapter(MockAdapterBase):
    def _init_state(self) -> None:
        self._intents: dict[str, PaymentIntent] = {}
        self._by_key: dict[str, PaymentIntent] = {}

    async def create_intent(
        self, amount: Money, player_ref: str, idempotency_key: str
    ) -> PaymentIntent:
        await self._simulate()
        if idempotency_key in self._by_key:
            return self._by_key[idempotency_key]
        if amount.amount_cents <= 0:
            raise AdapterRejectedError("amount must be positive", code="invalid_amount")
        intent = PaymentIntent(
            id=self._new_id(),
            amount=amount,
            status=PaymentStatus.requires_capture,
            idempotency_key=idempotency_key,
        )
        self._intents[intent.id] = intent
        self._by_key[idempotency_key] = intent
        return intent

    def _get(self, intent_id: str) -> PaymentIntent:
        intent = self._intents.get(intent_id)
        if intent is None:
            raise AdapterNotFoundError(f"unknown intent {intent_id}")
        return intent

    def _set_status(self, intent: PaymentIntent, status: PaymentStatus) -> PaymentIntent:
        updated = PaymentIntent(
            id=intent.id,
            amount=intent.amount,
            status=status,
            idempotency_key=intent.idempotency_key,
        )
        self._intents[intent.id] = updated
        self._by_key[intent.idempotency_key] = updated
        return updated

    async def capture(self, intent_id: str, idempotency_key: str) -> PaymentResult:
        await self._simulate()
        intent = self._get(intent_id)
        if intent.status is PaymentStatus.requires_capture:
            intent = self._set_status(intent, PaymentStatus.succeeded)
        return PaymentResult(intent_id=intent.id, status=intent.status, amount=intent.amount)

    async def refund(self, intent_id: str, amount: Money, idempotency_key: str) -> PaymentResult:
        await self._simulate()
        intent = self._get(intent_id)
        if intent.status not in (PaymentStatus.succeeded, PaymentStatus.refunded):
            raise AdapterRejectedError(
                "only captured payments can be refunded", code="not_captured"
            )
        intent = self._set_status(intent, PaymentStatus.refunded)
        return PaymentResult(intent_id=intent.id, status=intent.status, amount=amount)

    async def get_status(self, intent_id: str) -> PaymentStatus:
        await self._simulate()
        return self._get(intent_id).status
