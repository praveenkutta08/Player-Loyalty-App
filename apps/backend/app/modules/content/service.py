"""CMS content services. Publishing bumps the tenant manifest version so clients refetch."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.errors import ProblemException
from ..tenant_config.service import bump_version
from .models import ContentItem, ContentStatus
from .schemas import ContentCreate, ContentUpdate


async def list_items(session: AsyncSession, tenant_id: UUID) -> list[ContentItem]:
    return list(
        (
            await session.execute(
                select(ContentItem)
                .where(ContentItem.tenant_id == tenant_id)
                .order_by(ContentItem.created_at.desc())
            )
        )
        .scalars()
        .all()
    )


async def get_item(session: AsyncSession, tenant_id: UUID, item_id: UUID) -> ContentItem:
    item = (
        await session.execute(
            select(ContentItem).where(ContentItem.id == item_id, ContentItem.tenant_id == tenant_id)
        )
    ).scalar_one_or_none()
    if item is None:
        raise ProblemException(404, "Content item not found")
    return item


async def create_item(session: AsyncSession, tenant_id: UUID, data: ContentCreate) -> ContentItem:
    item = ContentItem(tenant_id=tenant_id, **data.model_dump())
    session.add(item)
    await session.flush()
    return item


async def update_item(
    session: AsyncSession, tenant_id: UUID, item_id: UUID, data: ContentUpdate
) -> ContentItem:
    item = await get_item(session, tenant_id, item_id)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    await session.flush()
    return item


async def delete_item(session: AsyncSession, tenant_id: UUID, item_id: UUID) -> None:
    item = await get_item(session, tenant_id, item_id)
    await session.delete(item)


async def publish_item(session: AsyncSession, tenant_id: UUID, item_id: UUID) -> ContentItem:
    item = await get_item(session, tenant_id, item_id)
    item.status = ContentStatus.published.value
    if item.publish_at is None:
        item.publish_at = datetime.now(UTC)
    await session.flush()
    # Clients cache-bust off the manifest version.
    await bump_version(session, tenant_id)
    return item


async def list_published(session: AsyncSession, tenant_id: UUID) -> list[ContentItem]:
    """App-facing: published items whose publish_at has passed."""
    now = datetime.now(UTC)
    return list(
        (
            await session.execute(
                select(ContentItem)
                .where(
                    ContentItem.tenant_id == tenant_id,
                    ContentItem.status == ContentStatus.published.value,
                    ContentItem.publish_at <= now,
                )
                .order_by(ContentItem.publish_at.desc())
            )
        )
        .scalars()
        .all()
    )
