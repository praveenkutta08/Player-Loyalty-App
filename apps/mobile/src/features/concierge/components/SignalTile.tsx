import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '../../../components';
import { useTheme } from '../../../theme/ThemeProvider';

import type { Signal } from '../types';

/** One structured signal (Drive · Weather · Tier) with its optional delta. */
export function SignalTile({ signal }: { signal: Signal }): React.JSX.Element {
  const theme = useTheme();
  const positive = signal.delta?.startsWith('-') ?? false; // "-12 vs usual" = faster = good
  return (
    <View
      style={[
        styles.tile,
        { backgroundColor: theme.colors.bg.surface, borderColor: theme.colors.border.soft },
      ]}
      testID={`signal-${signal.label.toLowerCase()}`}
    >
      <ThemedText variant="kicker" color="muted">
        {signal.label}
      </ThemedText>
      <ThemedText variant="title">{signal.value}</ThemedText>
      {signal.delta ? (
        <ThemedText
          variant="label"
          style={{
            color: positive ? theme.colors.state.success : theme.colors.text.muted,
          }}
        >
          {signal.delta}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 96,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
});
