"""RFC 7807 problem+json error handling.

Every error response uses the ``application/problem+json`` media type with at least
``type``, ``title`` and ``status`` members. Domain code raises :class:`ProblemException`
(or a plain ``HTTPException``) and these handlers render the standard body.
"""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from .logging import get_logger

PROBLEM_JSON = "application/problem+json"

logger = get_logger("errors")


class ProblemException(Exception):
    """Raise to return an RFC 7807 problem response."""

    def __init__(
        self,
        status: int,
        title: str,
        *,
        detail: str | None = None,
        type_: str = "about:blank",
        instance: str | None = None,
        headers: dict[str, str] | None = None,
        **extensions: Any,
    ) -> None:
        self.status = status
        self.title = title
        self.detail = detail
        self.type = type_
        self.instance = instance
        self.headers = headers
        self.extensions = extensions
        super().__init__(title)


def _problem(
    status: int,
    title: str,
    *,
    detail: str | None = None,
    type_: str = "about:blank",
    instance: str | None = None,
    headers: dict[str, str] | None = None,
    **extensions: Any,
) -> JSONResponse:
    body: dict[str, Any] = {"type": type_, "title": title, "status": status}
    if detail is not None:
        body["detail"] = detail
    if instance is not None:
        body["instance"] = instance
    body.update(extensions)
    return JSONResponse(
        status_code=status, content=body, media_type=PROBLEM_JSON, headers=headers
    )


async def _problem_exception_handler(request: Request, exc: ProblemException) -> JSONResponse:
    return _problem(
        exc.status,
        exc.title,
        detail=exc.detail,
        type_=exc.type,
        instance=exc.instance or str(request.url),
        headers=exc.headers,
        **exc.extensions,
    )


async def _http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    detail = exc.detail if isinstance(exc.detail, str) else None
    return _problem(
        exc.status_code,
        title=str(exc.detail) if exc.detail else "HTTP error",
        detail=detail,
        instance=str(request.url),
    )


async def _validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    return _problem(
        422,
        "Validation error",
        detail="The request parameters failed validation.",
        instance=str(request.url),
        # Pydantic v2 may embed raw exception objects in `ctx` — encode them to strings.
        errors=jsonable_encoder(exc.errors(), custom_encoder={Exception: str}),
    )


async def _unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error("unhandled_exception", path=str(request.url), exc_info=exc)
    return _problem(
        500,
        "Internal Server Error",
        detail="An unexpected error occurred.",
        instance=str(request.url),
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Wire the RFC 7807 handlers onto the app."""
    app.add_exception_handler(ProblemException, _problem_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(StarletteHTTPException, _http_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(RequestValidationError, _validation_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(Exception, _unhandled_exception_handler)
