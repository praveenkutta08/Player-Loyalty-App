"""Appearance schema: the manifest `splash` block + `navigation.style` (P7.1).

Every appearance option is a versioned enum with a documented default (roadmap §1): writes
REJECT unknown values (422), reads FALL BACK gracefully (older/corrupt config never 500s the
manifest — it resolves to the documented default and logs a warning). Fallbacks: splash variant
``silk``, navigation style ``editorial``, journey environment ``coast``.
"""

from __future__ import annotations

from typing import Any
from uuid import UUID

import structlog

from ...core.errors import ProblemException

logger = structlog.get_logger(__name__)

# --- versioned enums (v1) -------------------------------------------------------------------
APPEARANCE_SCHEMA_VERSION = 1

SPLASH_VARIANTS = ("journey", "collection", "portal", "silk")
DEFAULT_SPLASH_VARIANT = "silk"  # decided fallback — NOT the handoff's `horizon` (not in MVP)

NAV_STYLES = ("floatingPill", "editorial")
DEFAULT_NAV_STYLE = "editorial"

ENVIRONMENT_THEMES = ("coast", "mountain", "desert", "skyline", "forest")
DEFAULT_ENVIRONMENT_THEME = "coast"

DURATION_MIN_MS = 1800
DURATION_MAX_MS = 3000

# Curated, open-license font pairings bundled in the app binary (P3.4 scope constraint / P7.2).
# NO free-form font families and NO uploads — arbitrary tenant fonts would need an app build +
# store release + licensing check (roadmap §3.21). The pairing key is the manifest enum; the
# family names resolve into the theme tokens' fontFamily so existing consumers just work.
TYPOGRAPHY_PAIRINGS: dict[str, dict[str, str]] = {
    "bodoniManrope": {"display": "Bodoni Moda", "sans": "Manrope"},  # tokens.json default
    "marcellusManrope": {"display": "Marcellus", "sans": "Manrope"},  # splash handoff pairing
    "playfairInter": {"display": "Playfair Display", "sans": "Inter"},  # modern luxury
    "cormorantWorkSans": {"display": "Cormorant", "sans": "Work Sans"},  # editorial
}
DEFAULT_TYPOGRAPHY_PAIRING = "bodoniManrope"

# The `journey` terrain catalog: two SVG path strings (back + front, 100×216 canvas) per theme,
# from the design handoff. Themes are DATA — a new theme is a catalog entry served through the
# manifest, no app release required.
ENVIRONMENT_THEME_CATALOG: dict[str, dict[str, str]] = {
    "coast": {
        "back": "M0 172 Q25 164 50 172 Q75 179 100 168 L100 216 L0 216 Z",
        "front": "M0 186 Q30 180 58 187 Q80 192 100 184 L100 216 L0 216 Z",
    },
    "mountain": {
        "back": "M0 178 L18 148 L34 172 L52 142 L70 170 L86 154 L100 174 L100 216 L0 216 Z",
        "front": "M0 192 L22 176 L44 190 L68 174 L88 188 L100 182 L100 216 L0 216 Z",
    },
    "desert": {
        "back": "M0 176 Q30 154 60 174 Q80 184 100 166 L100 216 L0 216 Z",
        "front": "M0 190 Q35 200 65 186 Q85 178 100 190 L100 216 L0 216 Z",
    },
    "skyline": {
        "back": (
            "M0 180 L0 168 L10 168 L10 154 L20 154 L20 172 L32 172 L32 146 L42 146 L42 166 "
            "L54 166 L54 152 L64 152 L64 170 L76 170 L76 158 L88 158 L88 174 L100 174 "
            "L100 216 L0 216 Z"
        ),
        "front": (
            "M0 196 L14 196 L14 186 L26 186 L26 194 L44 194 L44 182 L58 182 L58 192 L76 192 "
            "L76 186 L90 186 L90 196 L100 196 L100 216 L0 216 Z"
        ),
    },
    "forest": {
        "back": (
            "M0 178 Q8 156 16 178 Q24 158 32 178 Q40 152 50 178 Q58 160 66 178 Q74 154 84 178 "
            "Q92 162 100 178 L100 216 L0 216 Z"
        ),
        "front": (
            "M0 194 Q10 180 20 194 Q30 178 40 194 Q50 180 60 194 Q70 178 80 194 Q90 182 "
            "100 194 L100 216 L0 216 Z"
        ),
    },
}


def _clamp_duration(value: Any) -> int | None:
    if value is None:
        return None
    try:
        ms = int(value)
    except (TypeError, ValueError):
        return None
    return max(DURATION_MIN_MS, min(DURATION_MAX_MS, ms))


def _is_hex_color(value: Any) -> bool:
    return (
        isinstance(value, str)
        and value.startswith("#")
        and len(value) in (4, 7, 9)
        and all(c in "0123456789abcdefABCDEF" for c in value[1:])
    )


# --- write path: strict ----------------------------------------------------------------------
def validate_splash_write(raw: dict[str, Any], tenant_id: UUID) -> dict[str, Any]:
    """Validate an admin-submitted splash config. Unknown enum values are REJECTED (422);
    the duration is clamped into [1800, 3000]; the logo must be a tenant-owned media key."""
    variant = raw.get("variant", DEFAULT_SPLASH_VARIANT)
    if variant not in SPLASH_VARIANTS:
        raise ProblemException(
            422,
            "Unknown splash variant",
            detail=f"variant must be one of {', '.join(SPLASH_VARIANTS)}.",
        )
    out: dict[str, Any] = {"schema_version": APPEARANCE_SCHEMA_VERSION, "variant": variant}

    logo = raw.get("logo_asset_id")
    if logo is not None:
        # Media Library keys are minted as tenants/{tenant_id}/... — enforce tenant ownership.
        if not isinstance(logo, str) or not logo.startswith(f"tenants/{tenant_id}/"):
            raise ProblemException(
                422,
                "Unknown logo asset",
                detail="logo_asset_id must be a media key belonging to this tenant.",
            )
        out["logo_asset_id"] = logo

    background = raw.get("background_value")
    if background is not None:
        if (
            not isinstance(background, list)
            or len(background) != 2
            or not all(_is_hex_color(c) for c in background)
        ):
            raise ProblemException(
                422,
                "Invalid background",
                detail="background_value must be [topHex, bottomHex].",
            )
        out["background_value"] = background

    tagline = raw.get("tagline_text")
    if tagline is not None:
        if not isinstance(tagline, str) or len(tagline) > 120:
            raise ProblemException(422, "Invalid tagline", detail="tagline_text ≤ 120 chars.")
        out["tagline_text"] = tagline

    if raw.get("animation_duration_ms") is not None:
        out["animation_duration_ms"] = _clamp_duration(raw["animation_duration_ms"])

    environment = raw.get("environment_theme")
    if environment is not None:
        if environment not in ENVIRONMENT_THEMES:
            raise ProblemException(
                422,
                "Unknown environment theme",
                detail=f"environment_theme must be one of {', '.join(ENVIRONMENT_THEMES)}.",
            )
        if variant != "journey":
            # Only journey has terrain; accept the write but drop the irrelevant key (warned).
            logger.warning(
                "appearance.environment_theme_ignored", variant=variant, theme=environment
            )
        else:
            out["environment_theme"] = environment

    unknown = set(raw) - {
        "variant",
        "logo_asset_id",
        "background_value",
        "tagline_text",
        "animation_duration_ms",
        "environment_theme",
        "schema_version",
    }
    if unknown:
        raise ProblemException(
            422, "Unknown splash fields", detail=f"Unsupported: {', '.join(sorted(unknown))}."
        )
    return out


def validate_nav_style_write(style: Any) -> str:
    if style not in NAV_STYLES:
        raise ProblemException(
            422,
            "Unknown navigation style",
            detail=f"navigation.style must be one of {', '.join(NAV_STYLES)}.",
        )
    return str(style)


def validate_typography_pairing_write(pairing: Any) -> str:
    if pairing not in TYPOGRAPHY_PAIRINGS:
        raise ProblemException(
            422,
            "Unknown typography pairing",
            detail=f"typography.pairing must be one of {', '.join(TYPOGRAPHY_PAIRINGS)}.",
        )
    return str(pairing)


# --- read path: tolerant ---------------------------------------------------------------------
def resolve_splash_read(raw: dict[str, Any] | None) -> dict[str, Any]:
    """Resolve the stored splash config for the manifest. NEVER raises: unknown/corrupt values
    fall back to the documented defaults (variant `silk`) with a warning."""
    raw = raw if isinstance(raw, dict) else {}
    variant = raw.get("variant", DEFAULT_SPLASH_VARIANT)
    if variant not in SPLASH_VARIANTS:
        logger.warning("appearance.unknown_splash_variant_fallback", variant=variant)
        variant = DEFAULT_SPLASH_VARIANT

    out: dict[str, Any] = {"schema_version": APPEARANCE_SCHEMA_VERSION, "variant": variant}
    if isinstance(raw.get("logo_asset_id"), str):
        out["logo_asset_id"] = raw["logo_asset_id"]
    background = raw.get("background_value")
    if isinstance(background, list) and len(background) == 2 and all(
        _is_hex_color(c) for c in background
    ):
        out["background_value"] = background
    if isinstance(raw.get("tagline_text"), str):
        out["tagline_text"] = raw["tagline_text"]
    if (duration := _clamp_duration(raw.get("animation_duration_ms"))) is not None:
        out["animation_duration_ms"] = duration

    if variant == "journey":
        environment = raw.get("environment_theme", DEFAULT_ENVIRONMENT_THEME)
        if environment not in ENVIRONMENT_THEMES:
            logger.warning("appearance.unknown_environment_fallback", theme=environment)
            environment = DEFAULT_ENVIRONMENT_THEME
        out["environment_theme"] = environment
        out["environment_theme_paths"] = ENVIRONMENT_THEME_CATALOG[environment]
    return out


def resolve_nav_style_read(style: Any) -> str:
    if style in NAV_STYLES:
        return str(style)
    if style is not None:
        logger.warning("appearance.unknown_nav_style_fallback", style=style)
    return DEFAULT_NAV_STYLE


def resolve_typography_pairing_read(pairing: Any) -> str:
    if pairing in TYPOGRAPHY_PAIRINGS:
        return str(pairing)
    if pairing is not None:
        logger.warning("appearance.unknown_typography_pairing_fallback", pairing=pairing)
    return DEFAULT_TYPOGRAPHY_PAIRING


def apply_typography_pairing(theme_tokens: dict[str, Any], pairing: str) -> dict[str, Any]:
    """Overlay the pairing's font families onto (a copy of) the theme tokens.

    Existing consumers read `typography.fontFamily.{display,sans}` from the tokens, so
    resolving the enum server-side means the pairing takes effect app-wide with no client
    changes. Sizes/weights stay token values — pairings only swap families.
    """
    fonts = TYPOGRAPHY_PAIRINGS[pairing]
    tokens = dict(theme_tokens)
    typography = dict(tokens.get("typography") or {})
    font_family = dict(typography.get("fontFamily") or {})
    font_family["display"] = fonts["display"]
    font_family["sans"] = fonts["sans"]
    typography["fontFamily"] = font_family
    tokens["typography"] = typography
    return tokens
