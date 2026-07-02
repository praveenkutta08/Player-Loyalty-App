"""P7.1: splash + navigation.style manifest schema — strict writes, tolerant reads, branding
permission gate, audit rows, and version bumps on publish."""

from __future__ import annotations

from app.db.session import SessionLocal
from app.modules.audit.models import AuditLog
from app.modules.tenant_config.models import TenantConfig
from httpx import AsyncClient
from sqlalchemy import select, update

from ._helpers import admin_headers, create_tenant, unique


async def _admin(api: AsyncClient, tenant_id: object) -> dict[str, str]:
    return await admin_headers(
        api, role="tenant_admin", tenant_id=tenant_id, allowed_tenant_ids=[tenant_id]
    )


async def _manifest(api: AsyncClient, tenant_id: object) -> dict:
    resp = await api.get("/api/v1/config/manifest", headers={"X-Tenant": str(tenant_id)})
    assert resp.status_code == 200
    return resp.json()


async def test_defaults_when_unconfigured(api: AsyncClient) -> None:
    tenant = await create_tenant(unique("appear"))
    manifest = await _manifest(api, tenant.id)
    # Documented fallbacks: silk splash, editorial nav style — always present, never 500.
    assert manifest["splash"]["variant"] == "silk"
    assert manifest["navigation"]["style"] == "editorial"
    assert manifest["navigation"]["tabs"]  # Option B structure untouched


async def test_publish_splash_and_nav_style_bumps_manifest_and_audits(api: AsyncClient) -> None:
    tenant = await create_tenant(unique("appear"))
    headers = await _admin(api, tenant.id)
    before = await _manifest(api, tenant.id)

    resp = await api.put(
        "/api/v1/config/appearance",
        headers=headers,
        json={
            "splash": {
                "variant": "journey",
                "environment_theme": "mountain",
                "background_value": ["#241626", "#0A0710"],
                "tagline_text": "GRAND RESORT & CLUB",
                "animation_duration_ms": 2600,
                "logo_asset_id": f"tenants/{tenant.id}/content/abc-logo.svg",
            },
            "navigation_style": "floatingPill",
        },
    )
    assert resp.status_code == 200

    after = await _manifest(api, tenant.id)
    assert after["version"] > before["version"]  # publish bumps
    splash = after["splash"]
    assert splash["variant"] == "journey"
    assert splash["environment_theme"] == "mountain"
    assert splash["environment_theme_paths"]["back"].startswith("M0 178")  # catalog data
    assert splash["background_value"] == ["#241626", "#0A0710"]
    assert splash["animation_duration_ms"] == 2600
    assert after["navigation"]["style"] == "floatingPill"
    assert after["navigation"]["tabs"] == before["navigation"]["tabs"]  # structure untouched

    async with SessionLocal() as session:  # audit row (golden rule #8)
        audit = (
            (
                await session.execute(
                    select(AuditLog).where(
                        AuditLog.tenant_id == tenant.id, AuditLog.action == "appearance:update"
                    )
                )
            )
            .scalars()
            .all()
        )
    assert audit and audit[-1].meta["splash_variant"] == "journey"
    assert audit[-1].meta["navigation_style"] == "floatingPill"


async def test_writes_reject_unknown_enums_and_clamp_duration(api: AsyncClient) -> None:
    tenant = await create_tenant(unique("appear"))
    headers = await _admin(api, tenant.id)

    # Unknown enums are rejected on WRITE (422) — including the handoff's non-MVP `horizon`.
    for bad in (
        {"splash": {"variant": "horizon"}},
        {"splash": {"variant": "silk", "environment_theme": "volcano"}},
        {"navigation_style": "adaptive"},
        {"splash": {"variant": "silk", "surprise_field": 1}},
        {"splash": {"variant": "silk", "background_value": ["red", "blue"]}},
    ):
        resp = await api.put("/api/v1/config/appearance", headers=headers, json=bad)
        assert resp.status_code == 422, bad

    # Foreign logo keys are rejected (must belong to this tenant's media prefix).
    foreign = await api.put(
        "/api/v1/config/appearance",
        headers=headers,
        json={"splash": {"variant": "silk", "logo_asset_id": "tenants/other/logo.png"}},
    )
    assert foreign.status_code == 422

    # Durations clamp into [1800, 3000] rather than erroring.
    for sent, stored in ((5000, 3000), (1000, 1800), (2200, 2200)):
        resp = await api.put(
            "/api/v1/config/appearance",
            headers=headers,
            json={"splash": {"variant": "silk", "animation_duration_ms": sent}},
        )
        assert resp.status_code == 200
        manifest = await _manifest(api, tenant.id)
        assert manifest["splash"]["animation_duration_ms"] == stored


async def test_environment_theme_only_applies_to_journey(api: AsyncClient) -> None:
    tenant = await create_tenant(unique("appear"))
    headers = await _admin(api, tenant.id)

    # Accepted (not an error) but dropped + warned for non-journey variants.
    resp = await api.put(
        "/api/v1/config/appearance",
        headers=headers,
        json={"splash": {"variant": "silk", "environment_theme": "desert"}},
    )
    assert resp.status_code == 200
    manifest = await _manifest(api, tenant.id)
    assert "environment_theme" not in manifest["splash"]

    # Journey without a theme fills the documented default (coast) + its paths.
    await api.put(
        "/api/v1/config/appearance", headers=headers, json={"splash": {"variant": "journey"}}
    )
    manifest = await _manifest(api, tenant.id)
    assert manifest["splash"]["environment_theme"] == "coast"
    assert "front" in manifest["splash"]["environment_theme_paths"]


async def test_reads_tolerate_corrupt_config(api: AsyncClient) -> None:
    """Older app binaries / newer schemas: the manifest falls back, it never 500s."""
    tenant = await create_tenant(unique("appear"))
    headers = await _admin(api, tenant.id)
    await api.put(
        "/api/v1/config/appearance",
        headers=headers,
        json={"splash": {"variant": "portal"}, "navigation_style": "floatingPill"},
    )

    # Corrupt the stored config directly as the DB owner (simulates a future/unknown schema).
    async with SessionLocal() as session:
        await session.execute(
            update(TenantConfig)
            .where(TenantConfig.tenant_id == tenant.id)
            .values(
                appearance={"splash": {"variant": "horizon", "animation_duration_ms": "bogus"}},
                navigation={"tabs": [], "style": "adaptive"},
            )
        )
        await session.commit()

    manifest = await _manifest(api, tenant.id)
    assert manifest["splash"]["variant"] == "silk"  # documented fallback
    assert "animation_duration_ms" not in manifest["splash"]
    assert manifest["navigation"]["style"] == "editorial"  # documented fallback


async def test_appearance_requires_branding_permission(api: AsyncClient) -> None:
    tenant = await create_tenant(unique("appear"))
    marketer = await admin_headers(
        api, role="marketer_editor", tenant_id=tenant.id, allowed_tenant_ids=[tenant.id]
    )
    resp = await api.put(
        "/api/v1/config/appearance", headers=marketer, json={"splash": {"variant": "silk"}}
    )
    assert resp.status_code == 403  # marketer has branding:read, not branding:update


async def test_typography_pairing_enum_and_font_resolution(api: AsyncClient) -> None:
    tenant = await create_tenant(unique("appear"))
    headers = await _admin(api, tenant.id)

    # Default pairing resolves into the theme tokens' fontFamily (no client changes needed).
    manifest = await _manifest(api, tenant.id)
    assert manifest["typography_pairing"] == "bodoniManrope"
    assert manifest["theme"]["typography"]["fontFamily"]["display"] == "Bodoni Moda"

    # Curated pairing publish swaps the resolved families; free-form values are rejected.
    resp = await api.put(
        "/api/v1/config/appearance",
        headers=headers,
        json={"typography_pairing": "marcellusManrope"},
    )
    assert resp.status_code == 200
    manifest = await _manifest(api, tenant.id)
    assert manifest["typography_pairing"] == "marcellusManrope"
    fonts = manifest["theme"]["typography"]["fontFamily"]
    assert (fonts["display"], fonts["sans"]) == ("Marcellus", "Manrope")

    rejected = await api.put(
        "/api/v1/config/appearance",
        headers=headers,
        json={"typography_pairing": "comicSansPapyrus"},
    )
    assert rejected.status_code == 422

    # Read-side fallback: corrupt stored pairing resolves to the default, never 500s.
    async with SessionLocal() as session:
        await session.execute(
            update(TenantConfig)
            .where(TenantConfig.tenant_id == tenant.id)
            .values(appearance={"typography": {"pairing": "uploadedFont"}})
        )
        await session.commit()
    manifest = await _manifest(api, tenant.id)
    assert manifest["typography_pairing"] == "bodoniManrope"


async def test_manifest_is_tenant_scoped(api: AsyncClient) -> None:
    tenant_a = await create_tenant(unique("appear-a"))
    tenant_b = await create_tenant(unique("appear-b"))
    headers = await _admin(api, tenant_a.id)
    await api.put(
        "/api/v1/config/appearance", headers=headers, json={"splash": {"variant": "collection"}}
    )
    assert (await _manifest(api, tenant_a.id))["splash"]["variant"] == "collection"
    assert (await _manifest(api, tenant_b.id))["splash"]["variant"] == "silk"  # untouched