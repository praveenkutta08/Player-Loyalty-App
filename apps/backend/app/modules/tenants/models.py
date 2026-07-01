"""Tenant registry model.

The ``tenants`` table is the source of tenancy itself — its ``id`` is the value that tenant-owned
tables reference via ``tenant_id`` and that RLS policies compare against. It is therefore NOT
tenant-owned and carries no RLS policy (super-admins manage it directly).
"""

from __future__ import annotations

import enum

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import BaseModel


class TenantStatus(enum.StrEnum):
    active = "active"
    suspended = "suspended"


class Tenant(BaseModel):
    __tablename__ = "tenants"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=TenantStatus.active.value, server_default="active"
    )
