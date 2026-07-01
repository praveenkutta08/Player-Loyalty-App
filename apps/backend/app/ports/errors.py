"""Error types shared by all adapter ports.

Domain code catches these (never provider-specific exceptions), so mock and real adapters are
interchangeable. Transient errors (``AdapterUnavailableError``/``AdapterTimeoutError``) are
retryable; ``AdapterRejectedError`` is a business rejection; ``AdapterNotFoundError`` is a missing
resource.
"""

from __future__ import annotations


class AdapterError(Exception):
    """Base class for all adapter failures."""


class AdapterUnavailableError(AdapterError):
    """The upstream provider was unreachable (transient — safe to retry)."""


class AdapterTimeoutError(AdapterError):
    """The upstream provider did not respond in time (transient)."""


class AdapterNotFoundError(AdapterError):
    """A referenced resource does not exist at the provider."""


class AdapterRejectedError(AdapterError):
    """The provider rejected the request for a business reason (e.g. insufficient funds)."""

    def __init__(self, message: str, *, code: str | None = None) -> None:
        super().__init__(message)
        self.code = code
