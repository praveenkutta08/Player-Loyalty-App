"""Pydantic schemas for player auth."""

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr


class PlayerLoginRequest(BaseModel):
    email: EmailStr
    password: str


class PlayerOtpRequest(BaseModel):
    email: EmailStr


class PlayerOtpVerify(BaseModel):
    email: EmailStr
    code: str


class PlayerMeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    email: str
    status: str
