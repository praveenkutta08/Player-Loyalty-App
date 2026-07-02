import { MapPin, ShieldCheck } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useAppSelector } from '../../app/store';
import { Button, Card, Screen, ThemedText, Toggle } from '../../components';
import { useTheme } from '../../theme/ThemeProvider';

import { useLocationConsent } from './useLocationConsent';

import type { MoreStackParamList } from '../more/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<MoreStackParamList, 'LocationConsent'>;

/**
 * A7 — Location consent. Explicit, purpose-first opt-in for location + background location, required
 * before any location-triggered offer (consent + GOLDEN RULE #8). The local toggle only flips when
 * the server records the consent (H7); a failed opt-out still tears down locally and queues a retry.
 */
export function LocationConsentScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme();
  const optedIn = useAppSelector((s) => s.notificationPrefs.locationOptIn);
  const { decide: decideConsent, isLoading } = useLocationConsent();
  const [background, setBackground] = useState(true);

  async function decide(granted: boolean): Promise<void> {
    const ok = await decideConsent(granted);
    if (ok && granted) navigation.goBack();
  }

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <MapPin size={40} color={theme.colors.brand.gold} />
          <ThemedText variant="h2" style={styles.title}>
            Offers near you
          </ThemedText>
          <ThemedText variant="body" color="muted" style={styles.blurb}>
            Share your location so we can send timely, on-property offers — like a dining perk when
            you’re near the Steakhouse. You’re always in control and can turn this off anytime.
          </ThemedText>
        </View>

        <Card style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowBody}>
              <ThemedText variant="title">Allow background location</ThemedText>
              <ThemedText variant="label" color="muted">
                Needed to notice when you arrive, even if the app is closed.
              </ThemedText>
            </View>
            <Toggle value={background} onValueChange={setBackground} testID="bg-toggle" />
          </View>
        </Card>

        <View style={styles.purpose}>
          <ShieldCheck size={16} color={theme.colors.text.muted} />
          <ThemedText variant="label" color="muted" style={styles.purposeText}>
            We only use location for offers and never sell it. Quiet hours are always respected.
          </ThemedText>
        </View>

        <Button
          label={optedIn ? 'Location enabled' : 'Enable location'}
          loading={isLoading}
          disabled={optedIn}
          onPress={() => void decide(true)}
          testID="grant-location"
        />
        <Button
          label={optedIn ? 'Turn off location' : 'Not now'}
          variant="secondary"
          style={styles.deny}
          onPress={() => void decide(false)}
          testID="deny-location"
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 16, paddingBottom: 32 },
  hero: { alignItems: 'center', marginBottom: 20 },
  title: { marginTop: 12 },
  blurb: { textAlign: 'center', marginTop: 8 },
  card: { marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBody: { flex: 1, marginRight: 12 },
  purpose: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  purposeText: { marginLeft: 8, flex: 1 },
  deny: { marginTop: 10 },
});
