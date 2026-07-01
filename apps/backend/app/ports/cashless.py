"""CashlessPort — cardless play funding/transfer/cashout.

All money-moving methods take an ``idempotency_key`` (GOLDEN RULE #4) so retries are safe.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol, runtime_checkable

from .types import Money


@dataclass(frozen=True)
class CashlessTransaction:
    id: str
    account_ref: str
    kind: str  # fund | transfer | cashout
    amount: Money
    balance: Money
    idempotency_key: str


@runtime_checkable
class CashlessPort(Protocol):
    async def get_balance(self, account_ref: str) -> Money: ...

    async def fund(
        self, account_ref: str, amount: Money, idempotency_key: str
    ) -> CashlessTransaction: ...

    async def transfer(
        self, account_ref: str, destination_ref: str, amount: Money, idempotency_key: str
    ) -> CashlessTransaction: ...

    async def cashout(
        self, account_ref: str, amount: Money, idempotency_key: str
    ) -> CashlessTransaction: ...
