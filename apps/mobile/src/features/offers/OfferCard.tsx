import React from 'react';
import { StyleSheet, View } from 'react-native';

import { CapsLabel, ImmersiveCard, PillButton, PillButtonRow } from '../../components';

import type { OfferOut } from './offersApi';

/** Category kicker for an offer — segment name if present, else a kind-based label. */
function offerKicker(offer: OfferOut): string {
  if (offer.segment) return offer.segment;
  return offer.kind === 'promotion' ? 'Limited Time' : 'Loyalty Reward';
}

/**
 * Offer/promotion card as an obsidian ImmersiveCard (RS4): full-bleed image (or a themed gradient
 * when none), a category kicker, a Playfair title, and CLAIM + VIEW DETAILS pills — or a CLAIMED
 * marker once redeemed. Presentational + token-driven; the claim/idempotency flow lives in detail.
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
  return (
    <View style={styles.wrap}>
      <ImmersiveCard
        image={offer.image_url ? { uri: offer.image_url } : undefined}
        kicker={offerKicker(offer)}
        title={offer.title}
        subtitle={offer.description ?? undefined}
        onPress={onPress}
        actions={
          redeemed ? (
            <CapsLabel color="secondary">✓ Claimed</CapsLabel>
          ) : (
            <PillButtonRow>
              <PillButton label="Claim" variant="accent" onPress={onPress} />
              <PillButton label="View details" variant="secondary" onPress={onPress} />
            </PillButtonRow>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
});
