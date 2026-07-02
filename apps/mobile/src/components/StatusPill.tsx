import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

import { ThemedText } from './ThemedText';

export type StatusTone = 'success' | 'warning' | 'error' | 'info' | 'purple' | 'muted';

export interface StatusPillProps {
  label: string;
  tone?: StatusTone;
}

/** Small rounded status chip with a leading dot (`components.statusPill`), tinted by a state token. */
export function StatusPill({ label, tone = 'info' }: StatusPillProps): React.JSX.Element {
  const theme = useTheme();
  const color = tone === 'muted' ? theme.colors.text.muted : theme.colors.state[tone];
  return (
    <View
      style={[
        styles.pill,
        {
          borderRadius: theme.radius.pill,
          borderColor: color,
          paddingHorizontal: theme.spacing.sm + 2,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <ThemedText variant="label" style={{ color }}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 4,
  },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
});
