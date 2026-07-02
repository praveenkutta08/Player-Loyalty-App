"""CMS content endpoints: permission-gated admin CRUD + media presign, and an app-facing list."""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.storage import create_presigned_upload, public_url
from ...db.session import get_session
from ...rbac.deps import AdminContext, AdminTenantIdDep, AdminTenantSessionDep, require
from ...rbac.matrix import Permission
from ..audit.models import ActorType
from ..audit.service import write_audit
from ..players.deps import get_current_player
from ..players.models import Player
from .schemas import (
    ContentCreate,
    ContentItemOut,
    ContentUpdate,
    PresignRequest,
    PresignResponse,
)
from .service import (
    create_item,
    delete_item,
    list_items,
    list_published,
    publish_item,
    update_item,
)

router = APIRouter()


@router.get(
    "/content",
    response_model=list[ContentItemOut],
    tags=["content"],
    dependencies=[Depends(require(Permission.content_read.value))],
)
async def admin_list_content(
    session: AdminTenantSessionDep, tenant_id: AdminTenantIdDep
) -> list[ContentItemOut]:
    return [ContentItemOut.model_validate(i) for i in await list_items(session, tenant_id)]


async def write_audit_content(
    session: AsyncSession, tenant_id: uuid.UUID, ctx: AdminContext, verb: str, item_id: uuid.UUID
) -> None:
    await write_audit(
        session,
        tenant_id=tenant_id,
        actor_type=ActorType.admin.value,
        actor_id=ctx.user.id,
        action=f"content:{verb}",
        entity="content_item",
        entity_id=item_id,
    )


@router.post(
    "/content",
    response_model=ContentItemOut,
    status_code=status.HTTP_201_CREATED,
    tags=["content"],
)
async def admin_create_content(
    body: ContentCreate,
    session: AdminTenantSessionDep,
    tenant_id: AdminTenantIdDep,
    ctx: Annotated[AdminContext, Depends(require(Permission.content_create.value))],
) -> ContentItemOut:
    item = await create_item(session, tenant_id, body)
    await write_audit_content(session, tenant_id, ctx, "create", item.id)
    return ContentItemOut.model_validate(item)


@router.put(
    "/content/{item_id}",
    response_model=ContentItemOut,
    tags=["content"],
)
async def admin_update_content(
    item_id: uuid.UUID,
    body: ContentUpdate,
    session: AdminTenantSessionDep,
    tenant_id: AdminTenantIdDep,
    ctx: Annotated[AdminContext, Depends(require(Permission.content_update.value))],
) -> ContentItemOut:
    item = await update_item(session, tenant_id, item_id, body)
    await write_audit_content(session, tenant_id, ctx, "update", item_id)
    return ContentItemOut.model_validate(item)


@router.post(
    "/content/{item_id}/publish",
    response_model=ContentItemOut,
    tags=["content"],
)
async def admin_publish_content(
    item_id: uuid.UUID,
    session: AdminTenantSessionDep,
    tenant_id: AdminTenantIdDep,
    ctx: Annotated[AdminContext, Depends(require(Permission.content_publish.value))],
) -> ContentItemOut:
    item = await publish_item(session, tenant_id, item_id)
    await write_audit_content(session, tenant_id, ctx, "publish", item_id)
    return ContentItemOut.model_validate(item)


@router.delete(
    "/content/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["content"],
)
async def admin_delete_content(
    item_id: uuid.UUID,
    session: AdminTenantSessionDep,
    tenant_id: AdminTenantIdDep,
    ctx: Annotated[AdminContext, Depends(require(Permission.content_delete.value))],
) -> None:
    await delete_item(session, tenant_id, item_id)
    await write_audit_content(session, tenant_id, ctx, "delete", item_id)


@router.post(
    "/content/media/presign",
    response_model=PresignResponse,
    tags=["content"],
    dependencies=[Depends(require(Permission.content_create.value))],
)
async def admin_presign_media(body: PresignRequest, tenant_id: AdminTenantIdDep) -> PresignResponse:
    # audit: exempt — issues a short-lived upload URL only; the media becoming visible happens
    # via content create/update, which are audited above.
    key = f"tenants/{tenant_id}/content/{uuid.uuid4().hex}-{body.filename}"
    return PresignResponse(
        key=key,
        upload_url=create_presigned_upload(key, content_type=body.content_type),
        media_url=public_url(key),
    )


@router.get("/app/content", response_model=list[ContentItemOut], tags=["content"])
async def app_list_content(
    player: Annotated[Player, Depends(get_current_player)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[ContentItemOut]:
    """Published content for the current player's tenant (RLS-scoped via the player's token)."""
    items = await list_published(session, player.tenant_id)
    return [ContentItemOut.model_validate(i) for i in items]
