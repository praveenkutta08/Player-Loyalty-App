import React from 'react';
import { View } from 'react-native';

import { Screen } from './Screen';
import { ThemedText } from './ThemedText';
import { useTheme } from '../theme/ThemeProvider';

/**
 * Placeholder body for tabs whose feature lands in a later Phase-4 prompt. Keeps the app shell
 * navigable now; each screen is replaced with its real implementation (Home/Offers in P4.4, etc.).
 */
export function ComingSoon({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}): React.JSX.Element {
  const theme = useTheme();
  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ThemedText variant="h1">{title}</ThemedText>
        <ThemedText variant="body" color="muted" style={{ marginTop: theme.spacing.sm }}>
          {subtitle ?? 'Coming soon.'}
        </ThemedText>
      </View>
    </Screen>
  );
}
