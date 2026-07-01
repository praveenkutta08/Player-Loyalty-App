"""Shared pytest fixtures."""

from __future__ import annotations

from collections.abc import AsyncIterator, Iterator

import pytest
import pytest_asyncio
from app.db.session import engine
from app.main import app
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncEngine


@pytest.fixture
def client() -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client


@pytest_asyncio.fixture
async def db_engine() -> AsyncIterator[AsyncEngine]:
    """Yield the app's async engine and dispose its pool after the test.

    pytest-asyncio runs each test in its own event loop; disposing here (inside that loop) prevents
    the module-level engine's pooled connections from leaking across loops.
    """
    yield engine
    await engine.dispose()
