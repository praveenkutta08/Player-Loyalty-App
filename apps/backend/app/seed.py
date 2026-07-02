"""Idempotent demo seed: one tenant with theme/flags, admins for each role, players, offers,
a reservation, a Steakhouse geofence + dwell trigger, games (incl. a jackpot) and rewards.

Run with: ``uv run python -m app.seed``. Runs as the DB owner (RLS bypassed), so tenant-owned
rows are inserted directly. Re-running makes no duplicates.
"""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.security import hash_password
from app.core.settings import get_settings
from app.modules.concierge.models import Property
from app.modules.concierge.service import DEFAULT_CONCIERGE_CONFIG
from app.modules.games.models import Game
from app.modules.geofencing.models import GeofenceZone, LocationTrigger, TriggerEvent
from app.modules.identity.models import AdminUser, AdminUserTenant, Role, UserRole
from app.modules.offers.models import Offer, OfferKind, OfferStatus
from app.modules.players.models import Player
from app.modules.reservations.models import Reservation, ReservationStatus, ReservationType
from app.modules.rewards.models import RewardItem, RewardStatus
from app.modules.tenant_config.models import TenantConfig, Theme
from app.modules.tenants.models import Tenant

DEMO_SLUG = "demo-casino"
DEMO_PASSWORD = "demo-pass"


async def _get_or_create[T](
    session: AsyncSession, model: type[T], defaults: dict[str, Any] | None = None, **filters: Any
) -> T:
    obj = (await session.execute(select(model).filter_by(**filters))).scalar_one_or_none()
    if obj is not None:
        return obj
    obj = model(**filters, **(defaults or {}))
    session.add(obj)
    await session.flush()
    return obj


async def _seed_admin(
    session: AsyncSession, tenant_id: Any, email: str, role_key: str, *, scoped: bool
) -> AdminUser:
    admin = await _get_or_create(
        session,
        AdminUser,
        {"password_hash": hash_password(DEMO_PASSWORD), "full_name": role_key.title()},
        email=email,
    )
    role_id = (await session.execute(select(Role.id).where(Role.key == role_key))).scalar_one()
    await _get_or_create(session, UserRole, admin_user_id=admin.id, role_id=role_id)
    if scoped:
        await _get_or_create(session, AdminUserTenant, admin_user_id=admin.id, tenant_id=tenant_id)
    return admin


async def seed() -> dict[str, Any]:
    # Seeding bypasses RLS by design — always connect with the owner/migration DSN, not the
    # app_runtime engine (audit C1). Engine is per-call so pytest event loops don't share pools.
    engine = create_async_engine(get_settings().database_url)
    try:
        session_factory = async_sessionmaker(engine, expire_on_commit=False, autoflush=False)
        return await _seed(session_factory)
    finally:
        await engine.dispose()


async def _seed(session_factory: async_sessionmaker[AsyncSession]) -> dict[str, Any]:
    async with session_factory() as session:
        tenant = await _get_or_create(
            session, Tenant, {"name": "Demo Casino", "status": "active"}, slug=DEMO_SLUG
        )

        config = await _get_or_create(
            session,
            TenantConfig,
            {
                "api_base_url": "http://localhost:8000/api/v1",
                "feature_flags": {
                    "cardless": True,
                    "digital_key": True,
                    "geofencing": True,
                    "games": True,
                    "reservations": True,
                    "valet": True,
                    "concierge": True,
                },
                "concierge": DEFAULT_CONCIERGE_CONFIG,
            },
            tenant_id=tenant.id,
        )
        # Defaults only apply on create — backfill concierge bits on pre-existing seeds.
        # (The "Luminara" sample config: persona "Aria", warm tone, gold/amber accent.)
        if not config.concierge:
            config.concierge = DEFAULT_CONCIERGE_CONFIG
        if not config.feature_flags.get("concierge"):
            config.feature_flags = {**config.feature_flags, "concierge": True}
        await _get_or_create(
            session,
            Theme,
            {"tokens": {"color": {"gold": "#E6B450"}}, "is_active": True},
            tenant_id=tenant.id,
            name="Casino Luxe",
        )

        # Admins for each role; global super-admin is unscoped, the rest are scoped to the tenant.
        await _seed_admin(session, tenant.id, "super@demo-casino.com", "super_admin", scoped=False)
        await _seed_admin(
            session, tenant.id, "accountmgr@demo-casino.com", "account_manager", scoped=True
        )
        await _seed_admin(
            session, tenant.id, "tenantadmin@demo-casino.com", "tenant_admin", scoped=True
        )
        await _seed_admin(
            session, tenant.id, "marketer@demo-casino.com", "marketer_editor", scoped=True
        )

        players = {}
        for email, segment in [
            ("alice@demo-casino.com", "vip"),
            ("bob@demo-casino.com", "gold"),
            ("carol@demo-casino.com", None),
        ]:
            players[email] = await _get_or_create(
                session,
                Player,
                {"password_hash": hash_password(DEMO_PASSWORD), "segment": segment},
                tenant_id=tenant.id,
                email=email,
            )

        welcome = await _get_or_create(
            session,
            Offer,
            {
                "description": "Welcome bonus",
                "status": OfferStatus.published.value,
                "segment": "all",
            },
            tenant_id=tenant.id,
            kind=OfferKind.offer.value,
            title="Welcome Offer",
        )
        await _get_or_create(
            session,
            Offer,
            {"description": "Weekend x2 points", "status": OfferStatus.published.value},
            tenant_id=tenant.id,
            kind=OfferKind.promotion.value,
            title="Weekend Promo",
        )

        # ~10 hand-tuned offers for concierge ranking (P6.7): varied segments + expiry windows so
        # `offer_score = relevance × urgency × feasibility` produces a visibly ordered For You.
        now = datetime.now(UTC)
        concierge_offers: list[tuple[str, str, str | None, int | None]] = [
            ("Steakhouse Dinner Credit", "Complimentary $75 steakhouse credit", "vip", 1),
            ("Weekend Free Play", "$50 free play, this weekend only", "vip", 3),
            ("Spa Sunday", "2-for-1 spa treatments on Sundays", "all", 6),
            ("Late-Night Slots Boost", "x3 points on slots after 10pm", "gold", 2),
            ("Show Tickets Upgrade", "Free upgrade to premium seating", "all", 9),
            ("Valet On Us", "Complimentary valet all month", "all", None),
            ("Poker Room Freeroll", "Sunday freeroll entry for members", "gold", 4),
            ("Birthday Bonus", "Double points during your birthday week", "all", None),
            ("Suite Night Escape", "Members' midweek suite rate", "vip", 12),
            ("Cafe Comp Breakfast", "Free breakfast with any hotel stay", "all", 20),
        ]
        for title, description, segment, days_left in concierge_offers:
            await _get_or_create(
                session,
                Offer,
                {
                    "description": description,
                    "status": OfferStatus.published.value,
                    "segment": segment,
                    "end_at": (now + timedelta(days=days_left)) if days_left else None,
                },
                tenant_id=tenant.id,
                kind=OfferKind.offer.value,
                title=title,
            )

        # Two properties with real coordinates (P6.7): weather/travel context anchors + the
        # later multi-property comparison. Primary = first created (Cascade Resort).
        await _get_or_create(
            session,
            Property,
            {
                "lat": 36.1147,
                "lng": -115.1728,
                "amenities": ["steakhouse", "spa", "poker_room", "pool", "theater"],
            },
            tenant_id=tenant.id,
            name="Cascade Resort & Casino",
        )
        await _get_or_create(
            session,
            Property,
            {
                "lat": 38.9399,
                "lng": -119.9772,
                "amenities": ["lodge", "ski_shuttle", "steakhouse"],
            },
            tenant_id=tenant.id,
            name="Cascade Summit Lodge",
        )

        # A confirmed hotel reservation for alice.
        if not (
            await session.execute(
                select(Reservation).where(
                    Reservation.player_id == players["alice@demo-casino.com"].id,
                    Reservation.type == ReservationType.hotel.value,
                )
            )
        ).scalar_one_or_none():
            session.add(
                Reservation(
                    tenant_id=tenant.id,
                    player_id=players["alice@demo-casino.com"].id,
                    type=ReservationType.hotel.value,
                    status=ReservationStatus.confirmed.value,
                    start_at=datetime.now(UTC),
                    end_at=datetime.now(UTC) + timedelta(days=2),
                    external_ref="BKG-DEMO0001",
                )
            )
            await session.flush()

        # Steakhouse geofence + the sample dwell trigger.
        steakhouse = await _get_or_create(
            session,
            GeofenceZone,
            {"type": "gps", "center_lat": 36.1, "center_lng": -115.1, "radius_m": 40},
            tenant_id=tenant.id,
            name="Steakhouse",
        )
        await _get_or_create(
            session,
            LocationTrigger,
            {
                "event": TriggerEvent.dwell.value,
                "dwell_seconds": 600,
                "offer_id": welcome.id,
                "frequency_cap_per_day": 1,
            },
            tenant_id=tenant.id,
            zone_id=steakhouse.id,
            name="Steakhouse dwell",
        )

        await _get_or_create(
            session,
            Game,
            {
                "category": "slots",
                "is_jackpot": True,
                "jackpot_amount_cents": 125_000_00,
                "status": "published",
                "featured": True,
            },
            tenant_id=tenant.id,
            title="Golden Dragon",
        )
        await _get_or_create(
            session,
            Game,
            {"category": "tables", "status": "published"},
            tenant_id=tenant.id,
            title="Blackjack Classic",
        )

        await _get_or_create(
            session,
            RewardItem,
            {"points_cost": 100, "stock": 50, "status": RewardStatus.published.value},
            tenant_id=tenant.id,
            title="Branded Cap",
        )
        await _get_or_create(
            session,
            RewardItem,
            {"points_cost": 500, "stock": 10, "status": RewardStatus.published.value},
            tenant_id=tenant.id,
            title="Steakhouse Dinner",
        )

        await session.commit()
        return {"tenant_id": str(tenant.id), "slug": tenant.slug}


if __name__ == "__main__":
    result = asyncio.run(seed())
    print(f"Seeded demo tenant: {result}")  # noqa: T201
