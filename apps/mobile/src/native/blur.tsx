import React from 'react';
import { View } from 'react-native';

import { withAlpha } from '../theme/color';
import { useTheme } from '../theme/ThemeProvider';

import type { StyleProp, ViewStyle } from 'react-native';

/**
 * Glass backdrop wrapper (native module isolated behind a TS interface, per the mobile conventions).
 *
 * The obsidian system calls for a real backdrop blur (20–40px) over deep-slate at 60–80% opacity.
 * Bare RN has no built-in backdrop blur; the drop-in is `@react-native-community/blur`'s `<BlurView>`.
 * Until that native module is installed + linked, this renders a high-fidelity fallback: a
 * translucent slate fill (from `components.glassCard.opacity`) that reads as frosted glass over the
 * obsidian void. Swapping to true blur is a one-file change here — every GlassCard/tab bar/sheet
 * goes through this component, so nothing else needs to touch native.
 *
 * It is trivially mockable in tests (it's a plain View).
 */
export function GlassBackdrop({ style }: { style?: StyleProp<ViewStyle> }): React.JSX.Element {
  const theme = useTheme();
  const glass = (theme.tokens.components.glassCard ?? {}) as { opacity?: number };
  const fill = withAlpha(theme.colors.bg.elevated, glass.opacity ?? 0.7);
  return (
    <View
      pointerEvents="none"
      style={[
        { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: fill },
        style,
      ]}
    />
  );
}
