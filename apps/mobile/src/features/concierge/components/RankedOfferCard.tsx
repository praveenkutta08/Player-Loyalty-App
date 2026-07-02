import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '../../../components';
import { useTheme } from '../../../theme/ThemeProvider';
import { useConciergePersona } from '../useConciergePersona';

import { WhyYouPill } from './WhyYouPill';

import type { RankedOffer } from '../types';

interface Props {
  offer: RankedOffer;
  onPress?: () => void;
}

/** A ranked "For You" offer: rank badge + title + why-you reasons. */
export function RankedOfferCard({ offer, onPress }: Props): React.JSX.Element {
  const theme = useTheme();
  const { accentColor } = useConciergePersona();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      testID={`ranked-offer-${offer.rank}`}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.colors.bg.surface,
          borderColor: theme.colors.border.soft,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={[styles.rankBadge, { borderColor: accentColor }]}>
        <ThemedText variant="label" style={{ color: accentColor }}>
          #{offer.rank}
        </ThemedText>
      </View>
      <View style={styles.body}>
        <ThemedText variant="title">{offer.title}</ThemedText>
        <ThemedText variant="label" color="muted" style={styles.kind}>
          {offer.kind}
        </ThemedText>
        <View style={styles.pills}>
          {offer.why_you.slice(0, 2).map((reason) => (
            <WhyYouPill key={reason.code + reason.chip} reason={reason} />
          ))}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 15,
    padding: 14,
  },
  rankBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 4 },
  kind: { textTransform: 'capitalize' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
});
