"""Schemas for wallet & cashless."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class WalletOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    player_id: UUID
    currency: str
    status: str
    balance_cents: int


class TransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    type: str
    amount_cents: int
    egm_id: str | None
    external_ref: str | None
    status: str


class FundRequest(BaseModel):
    amount_cents: int = Field(gt=0)


class TransferRequest(BaseModel):
    amount_cents: int = Field(gt=0)
    egm_id: str


class CashoutRequest(BaseModel):
    amount_cents: int = Field(gt=0)


class EgmPairRequest(BaseModel):
    egm_id: str


class EgmPairOut(BaseModel):
    session_id: UUID
    egm_id: str
    status: str
    paired_at: datetime
