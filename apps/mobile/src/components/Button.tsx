import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

import { ThemedText } from './ThemedText';

import type { StyleProp, ViewStyle } from 'react-native';

export type ButtonVariant = 'primary' | 'secondary';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  /** Optional leading icon element (e.g. a Lucide icon). */
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Primary = full-pill gold CTA (`components.buttonPrimary`); secondary = outlined control
 * (`components.buttonSecondary`). All colors/radii/heights come from the theme tokens.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  style,
  testID,
}: ButtonProps): React.JSX.Element {
  const theme = useTheme();
  const isPrimary = variant === 'primary';

  const bg = isPrimary ? theme.colors.brand.gold : 'transparent';
  const fg = isPrimary ? theme.colors.brand.onGold : theme.colors.text.primary;
  const radius = isPrimary ? theme.radius.pill : theme.radius.control;
  const height = isPrimary ? 40 : 36;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bg,
          borderRadius: radius,
          minHeight: height,
          paddingHorizontal: theme.spacing.lg,
          borderWidth: isPrimary ? 0 : StyleSheet.hairlineWidth * 2,
          borderColor: theme.colors.border.strong,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.content}>
          {icon ? <View style={{ marginRight: theme.spacing.sm }}>{icon}</View> : null}
          <ThemedText variant="title" style={{ color: fg }}>
            {label}
          </ThemedText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  content: { flexDirection: 'row', alignItems: 'center' },
});
