"""In-memory mock CashlessPort with idempotency and balance tracking."""

from __future__ import annotations

from ...ports.cashless import CashlessTransaction
from ...ports.errors import AdapterRejectedError
from ...ports.types import Money
from .base import MockAdapterBase


class MockCashlessAdapter(MockAdapterBase):
    def _init_state(self) -> None:
        self._balances: dict[str, int] = {}
        self._currency = "USD"
        self._by_key: dict[str, CashlessTransaction] = {}

    def _balance(self, account_ref: str) -> Money:
        return Money(self._balances.get(account_ref, 0), self._currency)

    async def get_balance(self, account_ref: str) -> Money:
        await self._simulate()
        return self._balance(account_ref)

    def _record(
        self, account_ref: str, kind: str, amount: Money, delta: int, idempotency_key: str
    ) -> CashlessTransaction:
        self._balances[account_ref] = self._balances.get(account_ref, 0) + delta
        txn = CashlessTransaction(
            id=self._new_id(),
            account_ref=account_ref,
            kind=kind,
            amount=amount,
            balance=self._balance(account_ref),
            idempotency_key=idempotency_key,
        )
        self._by_key[idempotency_key] = txn
        return txn

    async def fund(
        self, account_ref: str, amount: Money, idempotency_key: str
    ) -> CashlessTransaction:
        await self._simulate()
        if idempotency_key in self._by_key:
            return self._by_key[idempotency_key]
        if amount.amount_cents <= 0:
            raise AdapterRejectedError("amount must be positive", code="invalid_amount")
        return self._record(account_ref, "fund", amount, amount.amount_cents, idempotency_key)

    async def transfer(
        self, account_ref: str, destination_ref: str, amount: Money, idempotency_key: str
    ) -> CashlessTransaction:
        await self._simulate()
        if idempotency_key in self._by_key:
            return self._by_key[idempotency_key]
        if amount.amount_cents <= 0:
            raise AdapterRejectedError("amount must be positive", code="invalid_amount")
        if amount.amount_cents > self._balances.get(account_ref, 0):
            raise AdapterRejectedError("insufficient funds", code="insufficient_funds")
        return self._record(account_ref, "transfer", amount, -amount.amount_cents, idempotency_key)

    async def cashout(
        self, account_ref: str, amount: Money, idempotency_key: str
    ) -> CashlessTransaction:
        await self._simulate()
        if idempotency_key in self._by_key:
            return self._by_key[idempotency_key]
        if amount.amount_cents <= 0:
            raise AdapterRejectedError("amount must be positive", code="invalid_amount")
        if amount.amount_cents > self._balances.get(account_ref, 0):
            raise AdapterRejectedError("insufficient funds", code="insufficient_funds")
        return self._record(account_ref, "cashout", amount, -amount.amount_cents, idempotency_key)
