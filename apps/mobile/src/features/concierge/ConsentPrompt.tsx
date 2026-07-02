import React from 'react';
import { StyleSheet } from 'react-native';

import { Button, Card, ThemedText } from '../../components';

import { useSetConciergeConsentMutation } from './conciergeApi';

/**
 * First-use consent for stored-origin travel math (P6.6) — a SEPARATE explicit consent from
 * location_consent (integration plan §3). Declining keeps everything working, just without
 * drive-time context (the server flags travel as degraded, never fabricates it).
 *
 * MVP: the demo origin below stands in for an address-picker/geocoder (Phase 2). Coordinates are
 * demo data, not brand values — the manifest rule (#5) applies to branding, not fixtures.
 */
const DEMO_HOME_ORIGIN = { lat: 36.0395, lng: -114.9817, label: 'Home (demo)' };

interface Props {
  onDone?: (granted: boolean) => void;
}

export function ConsentPrompt({ onDone }: Props): React.JSX.Element {
  const [setConsent, state] = useSetConciergeConsentMutation();

  const decide = async (granted: boolean): Promise<void> => {
    try {
      await setConsent(granted ? { granted, home_origin: DEMO_HOME_ORIGIN } : { granted }).unwrap();
      onDone?.(granted);
    } catch {
      // Leave the prompt up — the player can retry.
    }
  };

  return (
    <Card style={styles.card} testID="consent-prompt">
      <ThemedText variant="title">Drive-time insights</ThemedText>
      <ThemedText variant="body" color="muted" style={styles.body}>
        Store a home location so your concierge can include traffic and drive time in its
        recommendations. This is optional and separate from location services — you can turn it off
        any time.
      </ThemedText>
      <Button
        label="Enable drive-time insights"
        onPress={() => void decide(true)}
        loading={state.isLoading}
        style={styles.cta}
        testID="consent-grant"
      />
      <Button
        label="Not now"
        variant="secondary"
        onPress={() => void decide(false)}
        style={styles.cta}
        testID="consent-decline"
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 4 },
  body: { marginBottom: 8 },
  cta: { marginTop: 8, alignSelf: 'flex-start' },
});
