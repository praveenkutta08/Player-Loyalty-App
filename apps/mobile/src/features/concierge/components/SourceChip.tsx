import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '../../../components';
import { useTheme } from '../../../theme/ThemeProvider';

const LABELS: Record<string, string> = {
  'player-mcp': 'Profile',
  'offers-mcp': 'Offers',
  'weather-mcp': 'Weather',
  'maps-mcp': 'Maps',
};

/** Tiny provenance chip — every AI answer shows which tools it came from. */
export function SourceChip({ source }: { source: string }): React.JSX.Element {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.chip,
        { borderColor: theme.colors.border.soft, backgroundColor: theme.colors.bg.surface },
      ]}
      accessibilityLabel={`Source: ${LABELS[source] ?? source}`}
    >
      <View style={[styles.dot, { backgroundColor: theme.colors.state.info }]} />
      <ThemedText variant="kicker" color="muted">
        {LABELS[source] ?? source}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dot: { width: 5, height: 5, borderRadius: 3 },
});
