"""Notification campaign endpoints (permission-gated: push_campaigns:*)."""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status

from ...adapters.factory import get_push_port
from ...ports.push import PushPort
from ...rbac.deps import AdminContext, AdminTenantIdDep, AdminTenantSessionDep, require
from ...rbac.matrix import Permission
from ..audit.models import ActorType
from ..audit.service import write_audit
from .schemas import DeliveryOut, NotificationCreate, NotificationOut, SendResult
from .service import (
    create_notification,
    get_notification,
    list_deliveries,
    list_notifications,
    send,
)

router = APIRouter()

PushDep = Annotated[PushPort, Depends(get_push_port)]


@router.get(
    "/notifications",
    response_model=list[NotificationOut],
    tags=["notifications"],
    dependencies=[Depends(require(Permission.push_campaigns_read.value))],
)
async def list_all(
    session: AdminTenantSessionDep, tenant_id: AdminTenantIdDep
) -> list[NotificationOut]:
    return [NotificationOut.model_validate(n) for n in await list_notifications(session, tenant_id)]


@router.post(
    "/notifications",
    response_model=NotificationOut,
    status_code=status.HTTP_201_CREATED,
    tags=["notifications"],
)
async def compose(
    body: NotificationCreate,
    session: AdminTenantSessionDep,
    tenant_id: AdminTenantIdDep,
    ctx: Annotated[AdminContext, Depends(require(Permission.push_campaigns_create.value))],
) -> NotificationOut:
    notification = await create_notification(session, tenant_id, body)
    await write_audit(
        session,
        tenant_id=tenant_id,
        actor_type=ActorType.admin.value,
        actor_id=ctx.user.id,
        action="notification:create",
        entity="notification",
        entity_id=notification.id,
    )
    return NotificationOut.model_validate(notification)


@router.post(
    "/notifications/{nid}/send",
    response_model=SendResult,
    tags=["notifications"],
)
async def send_now(
    nid: uuid.UUID,
    session: AdminTenantSessionDep,
    tenant_id: AdminTenantIdDep,
    push: PushDep,
    ctx: Annotated[AdminContext, Depends(require(Permission.push_campaigns_publish.value))],
) -> SendResult:
    notification = await get_notification(session, tenant_id, nid)
    delivered, total = await send(session, push, notification)
    await write_audit(
        session,
        tenant_id=tenant_id,
        actor_type=ActorType.admin.value,
        actor_id=ctx.user.id,
        action="notification:send",
        entity="notification",
        entity_id=nid,
        meta={"delivered": delivered, "total": total},
    )
    return SendResult(
        notification_id=nid, status=notification.status, delivered=delivered, total=total
    )


@router.get(
    "/notifications/{nid}/deliveries",
    response_model=list[DeliveryOut],
    tags=["notifications"],
    dependencies=[Depends(require(Permission.push_campaigns_read.value))],
)
async def deliveries(
    nid: uuid.UUID, session: AdminTenantSessionDep, tenant_id: AdminTenantIdDep
) -> list[DeliveryOut]:
    return [DeliveryOut.model_validate(d) for d in await list_deliveries(session, tenant_id, nid)]
