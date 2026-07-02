import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '../../components';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * A1 — brand load screen (presentational). Shown by the manifest gate while the tenant manifest
 * resolves on first launch (before any cache exists), so theme is applied before the first paint.
 */
export function BrandSplash({ title }: { title: string }): React.JSX.Element {
  const theme = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg.base }]}>
      <ThemedText variant="display" style={{ color: theme.colors.brand.gold }}>
        {title}
      </ThemedText>
      <ActivityIndicator
        color={theme.colors.brand.gold}
        style={{ marginTop: theme.spacing.xl }}
        accessibilityLabel="Loading"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
