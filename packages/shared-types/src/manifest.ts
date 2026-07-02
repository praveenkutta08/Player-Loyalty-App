/**
 * Tenant manifest — the versioned document the mobile app fetches at runtime to brand and
 * configure itself.
 *
 * GOLDEN RULE #5: the mobile app ships NO brand values. It fetches this manifest (design tokens +
 * feature flags + endpoints + version); CMS edits bump the version. Shape mirrors
 * `design/tokens.json`.
 */

/** A flat group of named color values (hex or rgba strings), e.g. `brand`, `bg`, `text`. */
export type ColorGroup = Record<string, string>;

/** A full color palette for one theme (dark or light). Keys mirror `design/tokens.json`. */
export interface ColorPalette {
  brand: ColorGroup;
  bg: ColorGroup;
  text: ColorGroup;
  state: ColorGroup;
  border: ColorGroup;
}

/** A single entry in the typographic scale. */
export interface TypographyStep {
  font: string;
  size: number;
  lineHeight: number;
  weight: number;
  uppercase?: boolean;
  letterSpacing?: string;
}

export interface Typography {
  fontFamily: Record<string, string>;
  scale: Record<string, TypographyStep>;
}

/** Resolved design tokens. `color` is the dark (default) theme; `colorLight` is the light theme. */
export interface ThemeTokens {
  color: ColorPalette;
  colorLight: ColorPalette;
  typography: Typography;
  radius: Record<string, number>;
  spacing: Record<string, number>;
  shadow: Record<string, string>;
  components: Record<string, Record<string, unknown>>;
}

/** Runtime feature flags; a false/absent flag hides the corresponding module (e.g. Digital Key). */
export type FeatureFlags = Record<string, boolean>;

/** Backend endpoints the app should talk to, resolved per tenant. */
export interface ManifestEndpoints {
  /** Base URL for the tenant's API, e.g. "https://api.example.com/api/v1". */
  apiBaseUrl: string;
  /** Additional named endpoints (websocket, assets CDN, etc.). */
  [key: string]: string;
}

/** A single bottom-nav tab in the manifest `navigation` block. */
export interface ManifestNavTab {
  key: string;
  label: string;
  icon: string;
  /** Feature flag that must be enabled for this tab to show; absent = always on. */
  requiresFlag?: string;
}

/** The prominent center action (Option B: Scan/Play). Falls back when its flag is off. */
export interface ManifestNavCenterAction {
  key: string;
  label: string;
  icon: string;
  /** Feature flag gating the primary action (e.g. `cardless`). */
  requiresFlag?: string;
  /** Tab/route key to fall back to when `requiresFlag` is disabled (e.g. `wallet`). */
  fallback?: string;
}

/** Global chrome toggles (notifications bell, search, support entry). */
export interface ManifestNavGlobals {
  showNotifications?: boolean;
  showSearch?: boolean;
  showSupport?: boolean;
}

/**
 * The manifest `navigation` block that drives the mobile bottom nav (Option B). Consumed lightly
 * from P4.2 and fully (config-driven tabs + center action) in P4.14.
 */
export interface ManifestNavigation {
  tabs: ManifestNavTab[];
  centerAction?: ManifestNavCenterAction;
  globals?: ManifestNavGlobals;
}

/**
 * Concierge persona (P6.4) — tenant-configured in Concierge Studio; never hardcoded in the app
 * (golden rule #5). The `concierge` feature flag gates the concierge UI; scoring weights and
 * guardrails stay server-side.
 */
export interface ManifestConcierge {
  /** Display name of the AI concierge, e.g. "Aria" (seed default) or the tenant's own. */
  personaName: string;
  /** Tone preset: e.g. "warm" | "professional" | "playful". */
  tone: string;
  /** Theme token key the concierge accent color resolves from (e.g. "gold", "primary"). */
  accentToken: string;
}

/**
 * The full versioned tenant manifest served from `/config/manifest`. The `version` is bumped by
 * the CMS on every branding/flag/endpoint change so clients can cache-bust and re-hydrate.
 *
 * Note: the backend serves these fields in snake_case (`tenant_id`, `feature_flags`,
 * `center_action`, …) and the `theme` may be partial; the mobile app normalizes to this camelCase
 * shape and deep-merges the theme over its white-label defaults at the API boundary.
 */
export interface TenantManifest {
  version: number;
  tenantId: string;
  tenantSlug: string;
  name: string;
  theme: ThemeTokens;
  featureFlags: FeatureFlags;
  endpoints: ManifestEndpoints;
  /** Bottom-nav configuration (tabs, center action, globals). */
  navigation?: ManifestNavigation;
  /** Concierge persona; present when the tenant has configured the concierge (P6.4). */
  concierge?: ManifestConcierge;
  /** ISO 8601 timestamp of when this manifest version was published. */
  updatedAt: string;
}
