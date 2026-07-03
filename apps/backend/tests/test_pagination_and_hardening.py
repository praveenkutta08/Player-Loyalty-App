"""Audit M2 (cursor pagination on audit-logs) + M5 (production secret/CORS boot guards)."""

from __future__ import annotations

import pytest
from app.core.settings import Settings
from httpx import AsyncClient

from ._helpers import admin_headers, create_tenant


async def test_audit_logs_are_cursor_paginated(api: AsyncClient) -> None:
    tenant = await create_tenant()
    admin = await admin_headers(api, tenant_id=tenant.id)

    # Generate several audit rows (config PUTs each write one).
    for i in range(5):
        await api.put("/api/v1/config", headers=admin, json={"feature_flags": {f"f{i}": True}})

    first = await api.get("/api/v1/audit-logs", headers=admin, params={"limit": 2})
    assert first.status_code == 200
    body = first.json()
    assert set(body) == {"items", "next_cursor", "has_more"}
    assert len(body["items"]) == 2
    assert body["has_more"] is True and body["next_cursor"]

    # Newest-first, and the next page continues without overlap.
    second = await api.get(
        "/api/v1/audit-logs",
        headers=admin,
        params={"limit": 2, "cursor": body["next_cursor"]},
    )
    page2 = second.json()
    first_ids = {r["id"] for r in body["items"]}
    page2_ids = {r["id"] for r in page2["items"]}
    assert first_ids.isdisjoint(page2_ids)

    # ts ordering is descending across the boundary.
    assert body["items"][-1]["ts"] >= page2["items"][0]["ts"]


def test_production_guard_rejects_dev_secrets_and_wildcard_cors() -> None:
    """M5: outside dev, dev JWT secret / MinIO defaults / wildcard CORS must refuse boot."""
    insecure = Settings(
        app_env="production",
        jwt_secret="dev-only-insecure-change-me-32bytes-minimum",
        s3_access_key="minioadmin",
        s3_secret_key="minioadmin",
        cors_origins=["*"],
    )
    with pytest.raises(RuntimeError, match="M5"):
        insecure.assert_production_safe()

    # A properly configured production settings passes.
    secure = Settings(
        app_env="production",
        jwt_secret="a-real-32-byte-minimum-production-secret-value",
        s3_access_key="AKIAREAL",
        s3_secret_key="realsecretkey",
        cors_origins=["https://admin.example.com"],
    )
    secure.assert_production_safe()  # no raise


def test_production_guard_is_noop_in_dev() -> None:
    Settings(app_env="dev").assert_production_safe()  # committed dev defaults are fine
