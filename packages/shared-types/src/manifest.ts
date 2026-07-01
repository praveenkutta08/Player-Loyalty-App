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

/**
 * The full versioned tenant manifest served from `/config/manifest`. The `version` is bumped by
 * the CMS on every branding/flag/endpoint change so clients can cache-bust and re-hydrate.
 */
export interface TenantManifest {
  version: number;
  tenantId: string;
  tenantSlug: string;
  name: string;
  theme: ThemeTokens;
  featureFlags: FeatureFlags;
  endpoints: ManifestEndpoints;
  /** ISO 8601 timestamp of when this manifest version was published. */
  updatedAt: string;
}
