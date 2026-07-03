import { GENERATED_DEFAULT_THEME } from './tokens.generated';

import type { ThemeTokens } from '@repo/shared-types';

/**
 * Default (white-label baseline) design tokens — a TS mirror of `design/tokens.json`, shared by
 * name with the admin console and the tenant manifest schema (GOLDEN RULE #5). The app ships NO
 * brand values of its own: at runtime the manifest's `theme` replaces these (see P4.2). These
 * defaults are only used before the manifest resolves (splash) and as a safety fallback.
 */
export const DEFAULT_THEME: ThemeTokens = GENERATED_DEFAULT_THEME;

/** Theme color scheme selector. Dark is the design default. */
export type ColorScheme = 'dark' | 'light';
