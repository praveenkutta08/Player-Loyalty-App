import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useAppDispatch, useAppSelector } from '../../app/store';
import { Card, Screen, ThemedText, Toggle } from '../../components';
import { useTheme } from '../../theme/ThemeProvider';

import {
  setLocationOptIn,
  setQuietHoursEnabled,
  toggleChannel,
} from './prefsSlice';

import type { NotificationChannel } from './prefsSlice';

const CHANNELS: { key: NotificationChannel; label: string; blurb: string }[] = [
  { key: 'offers', label: 'Offers', blurb: 'Personalized offers & bonuses' },
  { key: 'promotions', label: 'Promotions', blurb: 'Events & tournaments' },
  { key: 'account', label: 'Account', blurb: 'Wallet, reservations & security' },
  { key: 'concierge', label: 'Concierge', blurb: 'Recommendations & tips' },
];

/** M5 — Notification preferences: per-channel opt-in, quiet hours, and location opt-in. */
export function NotificationPreferencesScreen(): React.JSX.Element {
  const dispatch = useAppDispatch();
  const prefs = useAppSelector((s) => s.notificationPrefs);

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <ThemedText variant="label" color="muted" style={styles.label}>
          Channels
        </ThemedText>
        <Card style={styles.card}>
          {CHANNELS.map((c) => (
            <Row key={c.key} title={c.label} blurb={c.blurb}>
              <Toggle
                value={prefs.channels[c.key]}
                onValueChange={() => dispatch(toggleChannel(c.key))}
                testID={`channel-${c.key}`}
              />
            </Row>
          ))}
        </Card>

        <ThemedText variant="label" color="muted" style={styles.label}>
          Quiet hours
        </ThemedText>
        <Card style={styles.card}>
          <Row
            title="Pause overnight"
            blurb={`No pushes ${fmtHour(prefs.quietHours.startHour)}–${fmtHour(prefs.quietHours.endHour)}`}
          >
            <Toggle
              value={prefs.quietHours.enabled}
              onValueChange={(v) => dispatch(setQuietHoursEnabled(v))}
              testID="quiet-hours"
            />
          </Row>
        </Card>

        <ThemedText variant="label" color="muted" style={styles.label}>
          Location
        </ThemedText>
        <Card style={styles.card}>
          <Row title="Location-based offers" blurb="Nearby & on-property notifications">
            <Toggle
              value={prefs.locationOptIn}
              onValueChange={(v) => dispatch(setLocationOptIn(v))}
              testID="location-optin"
            />
          </Row>
        </Card>
      </ScrollView>
    </Screen>
  );
}

function Row({
  title,
  blurb,
  children,
}: {
  title: string;
  blurb: string;
  children: React.ReactNode;
}): React.JSX.Element {
  const theme = useTheme();
  return (
    <View style={[styles.row, { borderBottomColor: theme.colors.border.soft }]}>
      <View style={styles.rowBody}>
        <ThemedText variant="title">{title}</ThemedText>
        <ThemedText variant="label" color="muted">
          {blurb}
        </ThemedText>
      </View>
      {children}
    </View>
  );
}

function fmtHour(h: number): string {
  const period = h < 12 ? 'am' : 'pm';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}${period}`;
}

const styles = StyleSheet.create({
  content: { paddingVertical: 16, paddingBottom: 32 },
  label: { marginBottom: 8, marginTop: 12 },
  card: { marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowBody: { flex: 1, marginRight: 12 },
});
