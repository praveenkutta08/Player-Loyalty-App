import { Lock } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useFeature } from '../app/providers/FeatureProvider';
import { useTheme } from '../theme/ThemeProvider';

import { Screen } from './Screen';
import { ThemedText } from './ThemedText';

/**
 * G7 — feature-unavailable placeholder, shown when a module is gated off by a manifest feature flag.
 */
export function FeatureUnavailable({ label }: { label?: string }): React.JSX.Element {
  const theme = useTheme();
  return (
    <Screen>
      <View style={styles.center}>
        <Lock size={28} color={theme.colors.text.muted} />
        <ThemedText variant="h2" style={{ marginTop: theme.spacing.md }}>
          Not available
        </ThemedText>
        <ThemedText variant="body" color="muted" style={{ marginTop: theme.spacing.xs }}>
          {label ?? 'This feature is turned off for your venue.'}
        </ThemedText>
      </View>
    </Screen>
  );
}

/**
 * Renders `children` only when `flag` is enabled in the manifest; otherwise the G7 placeholder
 * (or a caller-supplied fallback). The server still enforces access — this only mirrors it.
 */
export function FeatureGate({
  flag,
  label,
  fallback,
  children,
}: {
  flag: string;
  label?: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}): React.JSX.Element {
  const enabled = useFeature(flag);
  if (enabled) return <>{children}</>;
  return <>{fallback ?? <FeatureUnavailable label={label} />}</>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
