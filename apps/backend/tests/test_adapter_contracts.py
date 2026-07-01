"""Contract tests for adapter ports.

Each port's suite runs against every registered provider via a parametrized fixture — today just
the mock, but a real/sandbox adapter added to the param list runs the same contract unchanged.
"""

from __future__ import annotations

import pytest
from app.adapters.factory import (
    get_cashless_port,
    get_digital_key_port,
    get_geo_port,
    get_kyc_port,
    get_loyalty_port,
    get_payment_port,
    get_push_port,
)
from app.adapters.mock.cashless import MockCashlessAdapter
from app.adapters.mock.digital_key import MockDigitalKeyAdapter
from app.adapters.mock.geo import MockGeoAdapter
from app.adapters.mock.kyc import MockKycAdapter
from app.adapters.mock.loyalty import MockLoyaltyAdapter
from app.adapters.mock.payment import MockPaymentAdapter
from app.adapters.mock.push import MockPushAdapter
from app.core.settings import get_settings
from app.ports import (
    CashlessPort,
    DigitalKeyPort,
    DigitalKeyStatus,
    GeoPort,
    KycPort,
    KycStatus,
    LoyaltyPort,
    PaymentPort,
    PaymentStatus,
    Platform,
    PushNotification,
    PushPort,
)
from app.ports.errors import AdapterError, AdapterNotFoundError, AdapterRejectedError
from app.ports.types import Money


# --------------------------------------------------------------------------- loyalty
@pytest.fixture(params=[MockLoyaltyAdapter])
def loyalty(request: pytest.FixtureRequest) -> LoyaltyPort:
    return request.param()


async def test_loyalty_earn_and_redeem(loyalty: LoyaltyPort) -> None:
    assert (await loyalty.get_account("p1")).points == 0
    earned = await loyalty.earn("p1", 600, "signup")
    assert earned.balance == 600
    assert (await loyalty.get_account("p1")).tier == "silver"

    redeemed = await loyalty.redeem("p1", 100, "reward")
    assert redeemed.balance == 500

    with pytest.raises(AdapterRejectedError):
        await loyalty.redeem("p1", 1_000_000, "too much")


# --------------------------------------------------------------------------- cashless
@pytest.fixture(params=[MockCashlessAdapter])
def cashless(request: pytest.FixtureRequest) -> CashlessPort:
    return request.param()


async def test_cashless_fund_transfer_cashout_and_idempotency(cashless: CashlessPort) -> None:
    assert (await cashless.get_balance("acct")).amount_cents == 0

    first = await cashless.fund("acct", Money(1000), "key-1")
    assert first.balance.amount_cents == 1000
    # Same idempotency key -> same transaction, no double credit.
    repeat = await cashless.fund("acct", Money(1000), "key-1")
    assert repeat.id == first.id
    assert (await cashless.get_balance("acct")).amount_cents == 1000

    await cashless.transfer("acct", "device-9", Money(300), "key-2")
    assert (await cashless.get_balance("acct")).amount_cents == 700

    with pytest.raises(AdapterRejectedError):
        await cashless.cashout("acct", Money(999_999), "key-3")


# --------------------------------------------------------------------------- digital key
@pytest.fixture(params=[MockDigitalKeyAdapter])
def digital_key(request: pytest.FixtureRequest) -> DigitalKeyPort:
    return request.param()


async def test_digital_key_lifecycle(digital_key: DigitalKeyPort) -> None:
    key = await digital_key.issue_key("res-1", "p1", "1207")
    assert key.status is DigitalKeyStatus.active
    assert len(await digital_key.list_keys("p1")) == 1

    unlock = await digital_key.unlock(key.id, "door-1")
    assert unlock.unlocked

    await digital_key.revoke(key.id)
    with pytest.raises(AdapterRejectedError):
        await digital_key.unlock(key.id, "door-1")
    with pytest.raises(AdapterNotFoundError):
        await digital_key.unlock("missing", "door-1")


# --------------------------------------------------------------------------- kyc
@pytest.fixture(params=[MockKycAdapter])
def kyc(request: pytest.FixtureRequest) -> KycPort:
    return request.param()


async def test_kyc_decisions(kyc: KycPort) -> None:
    approved = await kyc.start_verification("p1", "Jane Doe", "doc-1")
    assert approved.status is KycStatus.approved
    assert (await kyc.get_status(approved.id)).status is KycStatus.approved

    rejected = await kyc.start_verification("p2", "Please Reject", "doc-2")
    assert rejected.status is KycStatus.rejected

    with pytest.raises(AdapterNotFoundError):
        await kyc.get_status("missing")


# --------------------------------------------------------------------------- geo
@pytest.fixture(params=[MockGeoAdapter])
def geo(request: pytest.FixtureRequest) -> GeoPort:
    return request.param()


async def test_geo_jurisdiction(geo: GeoPort) -> None:
    inside = await geo.check_jurisdiction(36.1, -115.1)  # Las Vegas
    assert inside.allowed
    outside = await geo.check_jurisdiction(70.0, 10.0)
    assert not outside.allowed
    assert "Mock City" in await geo.reverse_geocode(36.1, -115.1)


# --------------------------------------------------------------------------- payment
@pytest.fixture(params=[MockPaymentAdapter])
def payment(request: pytest.FixtureRequest) -> PaymentPort:
    return request.param()


async def test_payment_flow_and_idempotency(payment: PaymentPort) -> None:
    intent = await payment.create_intent(Money(5000), "p1", "key-1")
    assert intent.status is PaymentStatus.requires_capture
    assert (await payment.create_intent(Money(5000), "p1", "key-1")).id == intent.id

    captured = await payment.capture(intent.id, "cap-1")
    assert captured.status is PaymentStatus.succeeded
    refunded = await payment.refund(intent.id, Money(5000), "ref-1")
    assert refunded.status is PaymentStatus.refunded

    with pytest.raises(AdapterNotFoundError):
        await payment.get_status("missing")


# --------------------------------------------------------------------------- push
@pytest.fixture(params=[MockPushAdapter])
def push(request: pytest.FixtureRequest) -> PushPort:
    return request.param()


async def test_push_delivery(push: PushPort) -> None:
    note = PushNotification(title="Hi", body="There")
    assert (await push.send("p1", note)).delivered is False  # no device yet

    await push.register_device("p1", "token-abc", Platform.ios)
    assert (await push.send("p1", note)).delivered is True

    receipts = await push.send_bulk(["p1", "p2"], note)
    assert len(receipts) == 2


# --------------------------------------------------------------------------- factory selection
def test_factory_selects_mock_by_default() -> None:
    assert isinstance(get_loyalty_port(), LoyaltyPort)
    assert isinstance(get_cashless_port(), CashlessPort)
    assert isinstance(get_digital_key_port(), DigitalKeyPort)
    assert isinstance(get_kyc_port(), KycPort)
    assert isinstance(get_geo_port(), GeoPort)
    assert isinstance(get_payment_port(), PaymentPort)
    assert isinstance(get_push_port(), PushPort)


def test_factory_rejects_unknown_provider(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(get_settings(), "payment_provider", "live")
    get_payment_port.cache_clear()
    try:
        with pytest.raises(AdapterError):
            get_payment_port()
    finally:
        get_payment_port.cache_clear()
