"""Audit H3 enforcement — every mutating route audits or carries an explicit exemption.

Golden Rule #8 says every privileged/financial action writes an audit_logs row. This test makes
omission fail review mechanically: each POST/PUT/PATCH/DELETE handler in app/modules/*/router.py
must either reference ``write_audit`` in its body (directly or via a ``*write_audit*`` helper)
or contain an explicit ``# audit: exempt — <reason>`` marker.
"""

from __future__ import annotations

import ast
from pathlib import Path

MODULES_DIR = Path(__file__).resolve().parents[1] / "app" / "modules"
MUTATING_METHODS = {"post", "put", "patch", "delete"}
EXEMPT_MARKER = "# audit: exempt"


def _mutating_handlers(path: Path) -> list[tuple[str, str]]:
    """Return (handler_name, source_segment) for every mutating route handler in the file."""
    src = path.read_text(encoding="utf-8")
    tree = ast.parse(src)
    found: list[tuple[str, str]] = []
    for node in ast.walk(tree):
        if not isinstance(node, ast.AsyncFunctionDef | ast.FunctionDef):
            continue
        for dec in node.decorator_list:
            if (
                isinstance(dec, ast.Call)
                and isinstance(dec.func, ast.Attribute)
                and dec.func.attr in MUTATING_METHODS
                and isinstance(dec.func.value, ast.Name)
                and dec.func.value.id == "router"
            ):
                found.append((node.name, ast.get_source_segment(src, node) or ""))
    return found


def test_every_mutating_route_audits_or_is_exempt() -> None:
    offenders: list[str] = []
    checked = 0
    for router_file in sorted(MODULES_DIR.glob("*/router.py")):
        for name, segment in _mutating_handlers(router_file):
            checked += 1
            if "write_audit" in segment or EXEMPT_MARKER in segment:
                continue
            offenders.append(f"{router_file.parent.name}.{name}")
    assert checked > 30, "sanity: the AST scan should find the app's mutating routes"
    assert not offenders, (
        "Mutating routes without an audit write or an explicit exemption "
        f"('{EXEMPT_MARKER} — <reason>'): {offenders}. Golden Rule #8: every "
        "privileged/financial mutation writes an audit_logs row."
    )
