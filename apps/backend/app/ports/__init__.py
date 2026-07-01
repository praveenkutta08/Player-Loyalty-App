"""Adapter ports — typed Protocols every external system is accessed through (GOLDEN RULE #3).

Domain code depends only on these interfaces and the shared error types; the concrete
implementation (mock vs sandbox vs live) is chosen by env via ``app.adapters.factory``.
"""

from .cashless import CashlessPort, CashlessTransaction
from .chat import ChatPort, ChatReply, FaqEntry
from .digital_key import DigitalKey, DigitalKeyPort, DigitalKeyStatus, UnlockResult
from .errors import (
    AdapterError,
    AdapterNotFoundError,
    AdapterRejectedError,
    AdapterTimeoutError,
    AdapterUnavailableError,
)
from .geo import GeoPort, JurisdictionResult
from .kyc import KycPort, KycSession, KycStatus
from .loyalty import LoyaltyAccount, LoyaltyActivity, LoyaltyPort, LoyaltyTransaction
from .payment import PaymentIntent, PaymentPort, PaymentResult, PaymentStatus
from .push import Platform, PushNotification, PushPort, PushReceipt
from .types import Money

__all__ = [
    "Money",
    "AdapterError",
    "AdapterNotFoundError",
    "AdapterRejectedError",
    "AdapterTimeoutError",
    "AdapterUnavailableError",
    "LoyaltyPort",
    "LoyaltyAccount",
    "LoyaltyActivity",
    "LoyaltyTransaction",
    "CashlessPort",
    "CashlessTransaction",
    "ChatPort",
    "ChatReply",
    "FaqEntry",
    "DigitalKeyPort",
    "DigitalKey",
    "DigitalKeyStatus",
    "UnlockResult",
    "KycPort",
    "KycSession",
    "KycStatus",
    "GeoPort",
    "JurisdictionResult",
    "PaymentPort",
    "PaymentIntent",
    "PaymentResult",
    "PaymentStatus",
    "PushPort",
    "PushNotification",
    "PushReceipt",
    "Platform",
]
