import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

import { DEFAULT_THEME } from './tokens';

import type { ColorScheme } from './tokens';
import type { ColorPalette, ThemeTokens, TypographyStep } from '@repo/shared-types';
import type { TextStyle } from 'react-native';

/**
 * Runtime theming. The provider holds the resolved manifest `theme` tokens (or the white-label
 * defaults before the manifest loads — P4.2 feeds real tenant tokens in) and exposes the active
 * color palette for the current light/dark scheme, plus helpers to turn typography-scale steps
 * into React Native text styles. Components read everything via `useTheme()` — no hardcoded values.
 */
export interface Theme {
  /** Full token tree (both dark `color` and `colorLight`). */
  tokens: ThemeTokens;
  /** Active scheme. */
  scheme: ColorScheme;
  /** The color palette for the active scheme (`color` when dark, `colorLight` when light). */
  colors: ColorPalette;
  spacing: ThemeTokens['spacing'];
  radius: ThemeTokens['radius'];
  fontFamily: ThemeTokens['typography']['fontFamily'];
  /** Resolve a named typography step (e.g. "h1", "body") to a RN TextStyle. */
  typography: (step: keyof ThemeTokens['typography']['scale'] | string) => TextStyle;
  setScheme: (scheme: ColorScheme) => void;
  toggleScheme: () => void;
}

const ThemeContext = createContext<Theme | null>(null);

/** Map a numeric font weight to the RN `fontWeight` union. */
function toFontWeight(weight: number): TextStyle['fontWeight'] {
  return String(weight) as TextStyle['fontWeight'];
}

/** Parse a token letterSpacing like "0.05em" into RN points relative to the font size. */
function toLetterSpacing(step: TypographyStep): number | undefined {
  if (!step.letterSpacing) return undefined;
  const em = parseFloat(step.letterSpacing);
  return Number.isFinite(em) ? em * step.size : undefined;
}

export function ThemeProvider({
  children,
  tokens = DEFAULT_THEME,
  initialScheme,
}: {
  children: React.ReactNode;
  tokens?: ThemeTokens;
  initialScheme?: ColorScheme;
}): React.JSX.Element {
  const systemScheme = useColorScheme();
  const [override, setOverride] = useState<ColorScheme | undefined>(initialScheme);
  const scheme: ColorScheme = override ?? (systemScheme === 'light' ? 'light' : 'dark');

  const toggleScheme = useCallback(
    () => setOverride((prev) => ((prev ?? scheme) === 'dark' ? 'light' : 'dark')),
    [scheme],
  );

  const value = useMemo<Theme>(() => {
    const colors = scheme === 'light' ? tokens.colorLight : tokens.color;
    const fontFamily = tokens.typography.fontFamily;
    const typography = (name: string): TextStyle => {
      const step = tokens.typography.scale[name] as TypographyStep | undefined;
      if (!step) return {};
      return {
        fontFamily: fontFamily[step.font] ?? fontFamily.sans,
        fontSize: step.size,
        lineHeight: step.lineHeight,
        fontWeight: toFontWeight(step.weight),
        letterSpacing: toLetterSpacing(step),
        textTransform: step.uppercase ? 'uppercase' : undefined,
      };
    };
    return {
      tokens,
      scheme,
      colors,
      spacing: tokens.spacing,
      radius: tokens.radius,
      fontFamily,
      typography,
      setScheme: setOverride,
      toggleScheme,
    };
  }, [tokens, scheme, toggleScheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
