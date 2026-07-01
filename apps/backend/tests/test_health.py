"""Smoke tests for the app skeleton: /health, OpenAPI, and RFC 7807 errors."""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_health_ok(client: TestClient) -> None:
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_openapi_served_at_api_v1(client: TestClient) -> None:
    resp = client.get("/api/v1/openapi.json")
    assert resp.status_code == 200
    body = resp.json()
    assert body["info"]["title"] == "Player Mobile App API"
    assert "/health" in body["paths"]


def test_unknown_route_returns_problem_json(client: TestClient) -> None:
    resp = client.get("/does-not-exist")
    assert resp.status_code == 404
    assert resp.headers["content-type"].startswith("application/problem+json")
    body = resp.json()
    assert body["status"] == 404
    assert "title" in body
    assert "type" in body
