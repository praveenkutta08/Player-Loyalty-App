import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

/** Token-driven progress bar (0..1), gold fill on a soft track. Used for tier progress. */
export function ProgressBar({ ratio }: { ratio: number }): React.JSX.Element {
  const theme = useTheme();
  const clamped = Math.min(Math.max(ratio, 0), 1);
  return (
    <View style={[styles.track, { backgroundColor: theme.colors.border.soft }]}>
      <View
        style={[
          styles.fill,
          { backgroundColor: theme.colors.brand.gold, width: `${clamped * 100}%` },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
});
