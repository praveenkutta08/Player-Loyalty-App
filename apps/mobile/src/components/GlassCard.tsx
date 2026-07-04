import React from 'react';
import { StyleSheet, View } from 'react-native';

import { GlassBackdrop } from '../native/blur';
import { useTheme } from '../theme/ThemeProvider';

import type { StyleProp, ViewStyle } from 'react-native';

export interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Radius token under `radius.*`. Defaults to "card" (16). */
  radius?: string;
  /** Drop the inner padding (for edge-to-edge content like image rows). */
  bare?: boolean;
  testID?: string;
}

/**
 * Glass surface (`components.glassCard`): a translucent slate fill (via {@link GlassBackdrop}) under
 * a 0.5px pearl "ghost" border and a 16px radius — depth from light refraction, not drop shadows
 * (DESIGN.md → Elevation & Depth). Everything is token-driven; screens never set glass colors.
 */
export function GlassCard({
  children,
  style,
  radius = 'card',
  bare = false,
  testID,
}: GlassCardProps): React.JSX.Element {
  const theme = useTheme();
  const r = theme.radius[radius] ?? theme.radius.card;
  return (
    <View
      testID={testID}
      style={[
        {
          borderRadius: r,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.border.ghost ?? theme.colors.border.soft,
          overflow: 'hidden',
          padding: bare ? 0 : theme.spacing.lg,
        },
        style,
      ]}
    >
      <GlassBackdrop style={{ borderRadius: r }} />
      {children}
    </View>
  );
}
