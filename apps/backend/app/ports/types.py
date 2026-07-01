"""Shared value objects used across ports."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Money:
    """Integer minor units + ISO 4217 currency (GOLDEN RULE #4 — never floats)."""

    amount_cents: int
    currency: str = "USD"

    def _same_currency(self, other: Money) -> None:
        if self.currency != other.currency:
            raise ValueError(f"currency mismatch: {self.currency} vs {other.currency}")

    def __add__(self, other: Money) -> Money:
        self._same_currency(other)
        return Money(self.amount_cents + other.amount_cents, self.currency)

    def __sub__(self, other: Money) -> Money:
        self._same_currency(other)
        return Money(self.amount_cents - other.amount_cents, self.currency)
