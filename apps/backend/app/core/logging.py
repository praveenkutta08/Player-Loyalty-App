"""Structured JSON logging via structlog.

In dev the renderer stays JSON so logs are consistent across environments; swap to a console
renderer locally if you prefer. Standard-library loggers (uvicorn, etc.) are routed through the
same processor chain so every line is structured JSON.
"""

from __future__ import annotations

import logging
import sys

import structlog


def configure_logging(app_env: str = "dev") -> None:
    """Configure structlog + stdlib logging to emit JSON to stdout."""
    level = logging.DEBUG if app_env.lower() in {"dev", "development", "local"} else logging.INFO

    shared_processors: list[structlog.types.Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]

    structlog.configure(
        processors=[
            *shared_processors,
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(level),
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )

    # Route stdlib logging (uvicorn, asyncio, etc.) through a JSON formatter as well.
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        structlog.stdlib.ProcessorFormatter(
            processor=structlog.processors.JSONRenderer(),
            foreign_pre_chain=shared_processors,
        )
    )
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(level)


def get_logger(name: str | None = None) -> structlog.stdlib.BoundLogger:
    """Return a bound structlog logger."""
    return structlog.get_logger(name)
