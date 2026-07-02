import { CloudOff } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

import { ThemedText } from './ThemedText';

/**
 * G6 — offline banner. Shown when the app is running from a cached manifest because the latest
 * fetch failed, so the user knows content may be stale.
 */
export function OfflineBanner(): React.JSX.Element {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: theme.colors.bg.elevated, borderBottomColor: theme.colors.border.soft },
      ]}
    >
      <CloudOff size={14} color={theme.colors.text.muted} />
      <ThemedText variant="label" color="muted" style={styles.text}>
        Offline — showing saved content
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  text: { marginLeft: 6 },
});
