import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { GlassBackdrop } from '../native/blur';
import { useTheme } from '../theme/ThemeProvider';

import { ThemedText } from './ThemedText';

import type { StyleProp, ViewStyle } from 'react-native';

/** Primary = solid pearl; accent = solid indigo; secondary = glass w/ 1px pearl border. */
export type PillVariant = 'primary' | 'accent' | 'secondary';

export interface PillButtonProps {
  label: string;
  onPress?: () => void;
  variant?: PillVariant;
  icon?: React.ReactNode;
  disabled?: boolean;
  /** Stretch to fill the parent row. */
  block?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Pill action button (DESIGN.md → Buttons): fully-rounded, 16px-language control. Primary is a solid
 * pearl fill, accent a solid indigo, secondary a glass fill with a 1px pearl border. All colors and
 * the height come from the theme's `components.button*` tokens.
 */
export function PillButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  block = false,
  style,
  testID,
}: PillButtonProps): React.JSX.Element {
  const theme = useTheme();
  const c = theme.colors;
  const secondary = variant === 'secondary';

  const bg =
    variant === 'accent' ? c.brand.accent : variant === 'primary' ? c.brand.primary : 'transparent';
  const fg =
    variant === 'accent'
      ? (c.brand.onAccent ?? '#FFFFFF')
      : variant === 'primary'
        ? c.brand.onPrimary
        : c.text.primary;

  return (
    <Pressable
      testID={testID}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.spacing.sm,
          height: 48,
          paddingHorizontal: theme.spacing.lg,
          borderRadius: theme.radius.pill,
          backgroundColor: bg,
          borderWidth: secondary ? 1 : 0,
          borderColor: secondary ? (c.border.ghost ?? c.border.strong) : 'transparent',
          overflow: 'hidden',
          opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
          alignSelf: block ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      {secondary ? <GlassBackdrop style={{ borderRadius: theme.radius.pill }} /> : null}
      {icon ? <View>{icon}</View> : null}
      <ThemedText variant="title" style={{ color: fg }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

/** Row wrapper for a primary + secondary CTA pair (immersive card / action-sheet footers). */
export function PillButtonRow({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
