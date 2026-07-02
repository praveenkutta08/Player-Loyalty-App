import { MapPin, Radar } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useAppDispatch, useAppSelector } from '../../app/store';
import { Button, Card, Screen, StatusPill, ThemedText } from '../../components';
import { useTheme } from '../../theme/ThemeProvider';
import { receiveMessage } from '../notifications/notificationsSlice';

import { DwellTracker } from './geo';
import { useGetGeoSyncQuery, usePostGeoEventMutation } from './geoApi';

import type { ZoneOut } from './geoApi';
import type { MoreStackParamList } from '../more/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<MoreStackParamList, 'Nearby'>;

const DWELL_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Location & nearby (P4.10). Gated on consent (A7). Lists the tenant's zones and provides a demo
 * that simulates a 10-minute dwell — the DwellTracker fires exactly once, the event is posted, and
 * the server's trigger engine returns the promo, which we surface in the inbox.
 */
export function NearbyScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme();
  const optedIn = useAppSelector((s) => s.notificationPrefs.locationOptIn);
  const sync = useGetGeoSyncQuery(undefined, { skip: !optedIn });

  if (!optedIn) {
    return (
      <Screen>
        <View style={styles.consent}>
          <MapPin size={40} color={theme.colors.brand.gold} />
          <ThemedText variant="h2" style={styles.consentTitle}>
            Enable location
          </ThemedText>
          <ThemedText variant="body" color="muted" style={styles.consentBlurb}>
            Turn on location to receive nearby, on-property offers.
          </ThemedText>
          <Button
            label="Set up location"
            style={styles.consentBtn}
            onPress={() => navigation.navigate('LocationConsent')}
            testID="setup-location"
          />
        </View>
      </Screen>
    );
  }

  const zones = (sync.data?.zones ?? []).filter((z) => z.is_active);

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <ThemedText variant="body" color="muted" style={styles.intro}>
          You’ll get offers when you spend time in these areas. Quiet hours and frequency caps are
          always respected.
        </ThemedText>
        {zones.length === 0 ? (
          <ThemedText variant="body" color="muted">
            No active zones for this venue yet.
          </ThemedText>
        ) : (
          zones.map((z) => <ZoneCard key={z.id} zone={z} />)
        )}
      </ScrollView>
    </Screen>
  );
}

function ZoneCard({ zone }: { zone: ZoneOut }): React.JSX.Element {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const [postEvent, { isLoading }] = usePostGeoEventMutation();
  const [outcome, setOutcome] = useState<'idle' | 'sent' | 'none'>('idle');

  async function simulateDwell(): Promise<void> {
    // Confirm the dwell fires exactly once for a continuous 10-minute presence.
    const tracker = new DwellTracker(DWELL_THRESHOLD_MS);
    tracker.enter(0);
    const fired = tracker.sample(DWELL_THRESHOLD_MS) === 'dwell';
    if (!fired) return;

    try {
      const res = await postEvent({
        zone_id: zone.id,
        event: 'dwell',
        dwell_seconds: DWELL_THRESHOLD_MS / 1000,
      }).unwrap();
      const triggered = res.results.find((r) => r.notification_id);
      if (triggered) {
        dispatch(
          receiveMessage({
            id: `geo-${triggered.notification_id}`,
            title: 'A perk near you',
            body: `Enjoy an offer for spending time at ${zone.name}.`,
            receivedAt: new Date().toISOString(),
            read: false,
            data: { type: 'offer' },
          }),
        );
        setOutcome('sent');
      } else {
        setOutcome('none');
      }
    } catch {
      setOutcome('none');
    }
  }

  return (
    <Card style={styles.card}>
      <View style={styles.zoneHead}>
        <Radar size={18} color={theme.colors.brand.gold} />
        <ThemedText variant="title" style={styles.zoneName}>
          {zone.name}
        </ThemedText>
        {outcome === 'sent' ? <StatusPill label="Offer sent" tone="success" /> : null}
      </View>
      <ThemedText variant="label" color="muted">
        {zone.type === 'gps' ? 'GPS zone' : 'Indoor beacon zone'}
        {zone.radius_m ? ` · ${zone.radius_m}m` : ''}
      </ThemedText>
      <Button
        label="Simulate 10-min dwell"
        variant="secondary"
        loading={isLoading}
        style={styles.demo}
        onPress={() => void simulateDwell()}
        testID={`dwell-${zone.id}`}
      />
      {outcome === 'none' ? (
        <ThemedText variant="label" color="muted" style={styles.note}>
          No offer this time (quiet hours or frequency cap).
        </ThemedText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 16, paddingBottom: 32 },
  intro: { marginBottom: 16 },
  card: { marginBottom: 12 },
  zoneHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  zoneName: { flex: 1, marginLeft: 8 },
  demo: { marginTop: 12, alignSelf: 'flex-start' },
  note: { marginTop: 8 },
  consent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  consentTitle: { marginTop: 12 },
  consentBlurb: { textAlign: 'center', marginTop: 8 },
  consentBtn: { marginTop: 20 },
});
