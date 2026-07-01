"""Support assistant: answers from tenant FAQ, refuses transactional asks, escalates."""

from __future__ import annotations

from httpx import AsyncClient

from ._helpers import admin_headers, create_tenant, player_token


async def test_faq_answer_refusal_and_escalation(api: AsyncClient) -> None:
    tenant = await create_tenant()
    admin = await admin_headers(api, tenant_id=tenant.id)
    auth = {"Authorization": f"Bearer {await player_token(api, tenant.id)}"}

    await api.post(
        "/api/v1/support/faq",
        headers=admin,
        json={
            "question": "What are the pool opening hours?",
            "answer": "The pool is open 6am-10pm.",
        },
    )

    # Answered from tenant FAQ.
    answered = await api.post(
        "/api/v1/support/chat", headers=auth, json={"message": "When does the pool open?"}
    )
    assert answered.status_code == 200
    body = answered.json()
    assert "6am-10pm" in body["reply"]
    assert body["escalate"] is False
    session_id = body["session_id"]

    # Refuses transactional requests (guardrail).
    refused = await api.post(
        "/api/v1/support/chat",
        headers=auth,
        json={"message": "Please transfer money to my game", "session_id": session_id},
    )
    assert refused.json()["refused"] is True

    # Unknown question -> low confidence + escalate suggestion.
    unknown = await api.post(
        "/api/v1/support/chat",
        headers=auth,
        json={"message": "Tell me about quantum physics", "session_id": session_id},
    )
    assert unknown.json()["escalate"] is True

    # History captures the conversation.
    hist = await api.get(f"/api/v1/support/history?session_id={session_id}", headers=auth)
    assert len(hist.json()) >= 6  # 3 user + 3 assistant

    # Escalation opens a ticket.
    ticket = await api.post(
        "/api/v1/support/escalate",
        headers=auth,
        json={"session_id": session_id, "subject": "Need a human"},
    )
    assert ticket.status_code == 200
    assert ticket.json()["status"] == "open"
