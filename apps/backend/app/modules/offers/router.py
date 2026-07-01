"""Offer/promotion admin CRUD (permission-gated per kind) + app-facing list/redeem."""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Header, status
from sqlalchemy.ext.asyncio import AsyncSession

from ...db.session import get_session
from ...rbac.deps import AdminTenantIdDep, AdminTenantSessionDep, require
from ..players.deps import get_current_player
from ..players.models import Player
from .models import OfferKind
from .schemas import OfferCreate, OfferOut, OfferUpdate, RedemptionOut
from .service import (
    create_offer,
    delete_offer,
    list_offers,
    list_targeted,
    publish_offer,
    redeem,
    update_offer,
)

router = APIRouter()

PlayerDep = Annotated[Player, Depends(get_current_player)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]


def _register_admin_group(prefix: str, kind: OfferKind, resource: str) -> None:
    """Register CRUD+publish for a catalog kind under ``prefix``, gated by ``resource:*``."""
    read = require(f"{resource}:read")
    create = require(f"{resource}:create")
    update = require(f"{resource}:update")
    delete = require(f"{resource}:delete")
    publish = require(f"{resource}:publish")
    tag = prefix.strip("/")

    @router.get(prefix, response_model=list[OfferOut], tags=[tag], dependencies=[Depends(read)])
    async def _list(session: AdminTenantSessionDep, tenant_id: AdminTenantIdDep) -> list[OfferOut]:
        return [OfferOut.model_validate(o) for o in await list_offers(session, tenant_id, kind)]

    @router.post(
        prefix,
        response_model=OfferOut,
        status_code=status.HTTP_201_CREATED,
        tags=[tag],
        dependencies=[Depends(create)],
    )
    async def _create(
        body: OfferCreate, session: AdminTenantSessionDep, tenant_id: AdminTenantIdDep
    ) -> OfferOut:
        return OfferOut.model_validate(await create_offer(session, tenant_id, kind, body))

    @router.put(
        prefix + "/{offer_id}", response_model=OfferOut, tags=[tag], dependencies=[Depends(update)]
    )
    async def _update(
        offer_id: uuid.UUID,
        body: OfferUpdate,
        session: AdminTenantSessionDep,
        tenant_id: AdminTenantIdDep,
    ) -> OfferOut:
        return OfferOut.model_validate(await update_offer(session, tenant_id, offer_id, kind, body))

    @router.post(
        prefix + "/{offer_id}/publish",
        response_model=OfferOut,
        tags=[tag],
        dependencies=[Depends(publish)],
    )
    async def _publish(
        offer_id: uuid.UUID, session: AdminTenantSessionDep, tenant_id: AdminTenantIdDep
    ) -> OfferOut:
        return OfferOut.model_validate(await publish_offer(session, tenant_id, offer_id, kind))

    @router.delete(
        prefix + "/{offer_id}",
        status_code=status.HTTP_204_NO_CONTENT,
        tags=[tag],
        dependencies=[Depends(delete)],
    )
    async def _delete(
        offer_id: uuid.UUID, session: AdminTenantSessionDep, tenant_id: AdminTenantIdDep
    ) -> None:
        await delete_offer(session, tenant_id, offer_id, kind)


_register_admin_group("/offers", OfferKind.offer, "offers")
_register_admin_group("/promotions", OfferKind.promotion, "promotions")


@router.get("/app/offers", response_model=list[OfferOut], tags=["offers"])
async def app_list_offers(player: PlayerDep, session: SessionDep) -> list[OfferOut]:
    return [OfferOut.model_validate(o) for o in await list_targeted(session, player, "offer")]


@router.get("/app/promotions", response_model=list[OfferOut], tags=["promotions"])
async def app_list_promotions(player: PlayerDep, session: SessionDep) -> list[OfferOut]:
    return [OfferOut.model_validate(o) for o in await list_targeted(session, player, "promotion")]


@router.post("/app/offers/{offer_id}/redeem", response_model=RedemptionOut, tags=["offers"])
async def app_redeem_offer(
    offer_id: uuid.UUID,
    player: PlayerDep,
    session: SessionDep,
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> RedemptionOut:
    return RedemptionOut.model_validate(await redeem(session, player, offer_id, idempotency_key))
