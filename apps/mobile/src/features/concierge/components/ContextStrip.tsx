import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '../../../components';
import { useTheme } from '../../../theme/ThemeProvider';

import type { Signal } from '../types';

/** Compact weather · drive · traffic strip under the Home hero (dot-separated). */
export function ContextStrip({ signals }: { signals: Signal[] }): React.JSX.Element | null {
  const theme = useTheme();
  if (signals.length === 0) return null;
  return (
    <View style={styles.row} testID="context-strip">
      {signals.map((signal, index) => (
        <View key={signal.label} style={styles.item}>
          {index > 0 ? (
            <ThemedText variant="label" color="faint" style={styles.dot}>
              ·
            </ThemedText>
          ) : null}
          <ThemedText variant="label" color="muted">
            {signal.label} {signal.value}
            {signal.delta ? (
              <ThemedText variant="label" style={{ color: theme.colors.state.success }}>
                {'  '}
                {signal.delta}
              </ThemedText>
            ) : null}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  item: { flexDirection: 'row', alignItems: 'center' },
  dot: { marginHorizontal: 6 },
});
