import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '../../../components';
import { useTheme } from '../../../theme/ThemeProvider';
import { useConciergePersona } from '../useConciergePersona';

import type { Reason } from '../types';

/** "Why you" reason chip — accent-tinted, machine-readable reason rendered human. */
export function WhyYouPill({ reason }: { reason: Reason }): React.JSX.Element {
  const theme = useTheme();
  const { accentColor } = useConciergePersona();
  return (
    <View
      style={[styles.pill, { borderColor: accentColor, backgroundColor: theme.colors.bg.surface }]}
      accessibilityLabel={reason.detail}
    >
      <ThemedText variant="label" style={{ color: accentColor }}>
        {reason.chip}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
});
