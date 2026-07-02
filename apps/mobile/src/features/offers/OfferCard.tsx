import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, StatusPill, ThemedText } from '../../components';
import { useTheme } from '../../theme/ThemeProvider';

import type { OfferOut } from './offersApi';

/**
 * Offer/promotion summary card used in lists and on Home. Shows title, blurb, a kind badge and a
 * "Redeemed" pill when already redeemed. Purely presentational + token-driven.
 */
export function OfferCard({
  offer,
  redeemed = false,
  onPress,
}: {
  offer: OfferOut;
  redeemed?: boolean;
  onPress?: () => void;
}): React.JSX.Element {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <StatusPill label={offer.kind} tone={offer.kind === 'promotion' ? 'purple' : 'info'} />
          {redeemed ? <StatusPill label="Redeemed" tone="success" /> : null}
        </View>
        <ThemedText variant="title" style={{ marginTop: theme.spacing.sm }}>
          {offer.title}
        </ThemedText>
        {offer.description ? (
          <ThemedText variant="body" color="muted" numberOfLines={2} style={{ marginTop: 4 }}>
            {offer.description}
          </ThemedText>
        ) : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
