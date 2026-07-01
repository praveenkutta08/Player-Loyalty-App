"""Shared FastAPI dependencies.

Placeholders for now. Later phases add: the async DB session, the tenancy dependency that resolves
the current tenant and sets the RLS GUC, the two auth audiences (player/admin), and the
``require("resource:action")`` permission dependency.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends

from .settings import Settings, get_settings

SettingsDep = Annotated[Settings, Depends(get_settings)]
