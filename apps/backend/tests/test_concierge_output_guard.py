"""LOW — concierge narration output post-check: ungrounded $ / % figures fall back."""

from __future__ import annotations

from app.modules.concierge.service import _sanitize_narration

CONTEXT = {
    "fit_score": 82,
    "offer_titles": ["Weekend bonus", "$50 dining credit"],
    "chips": ["Great weather", "20% off spa"],
}
FALLBACK = "Visit fit 82/100 — Great weather; 20% off spa"


def test_grounded_figures_pass_through() -> None:
    ok = "A strong 82/100 fit with a $50 dining credit and 20% off the spa."
    assert _sanitize_narration(ok, CONTEXT, FALLBACK) == ok


def test_fabricated_money_falls_back() -> None:
    bad = "Claim your $500 welcome bonus now!"  # 500 not in context
    assert _sanitize_narration(bad, CONTEXT, FALLBACK) == FALLBACK


def test_fabricated_percentage_falls_back() -> None:
    bad = "Enjoy 90% off everything this weekend."  # 90 not in context
    assert _sanitize_narration(bad, CONTEXT, FALLBACK) == FALLBACK


def test_plain_narration_without_figures_passes() -> None:
    plain = "The weather looks great for your visit — head to the spa first."
    assert _sanitize_narration(plain, CONTEXT, FALLBACK) == plain
