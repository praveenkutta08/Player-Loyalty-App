import {
  Bell,
  CalendarDays,
  Car,
  Gamepad2,
  KeyRound,
  LifeBuoy,
  MapPin,
  Palette,
  ShieldCheck,
} from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { useManifest } from '../../app/manifest/ManifestProvider';
import { useFeature } from '../../app/providers/FeatureProvider';
import { Card, ListRow, Screen, ThemedText } from '../../components';
import { useTheme } from '../../theme/ThemeProvider';

import type { MoreStackParamList } from './types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<MoreStackParamList, 'MoreHome'>;

/** M1 — More hub: services + settings, each gated by its manifest feature flag. */
export function MoreHomeScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme();
  const reservations = useFeature('reservations');
  const valet = useFeature('valet');
  const digitalKey = useFeature('digital_key');
  const games = useFeature('games');
  const { manifest } = useManifest();
  const showSupport = manifest?.navigation?.globals?.showSupport !== false;
  const icon = (I: typeof CalendarDays) => <I size={20} color={theme.colors.text.secondary} />;

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Concierge card always shows (Nearby is always available); flagged items gate per-row. */}
        <ThemedText variant="label" color="muted" style={styles.label}>
          Concierge
        </ThemedText>
        <Card style={styles.card}>
              {reservations ? (
                <ListRow
                  icon={icon(CalendarDays)}
                  title="Reservations"
                  subtitle="Hotel, dining & nightlife"
                  onPress={() => navigation.navigate('Reservations')}
                />
              ) : null}
              {valet ? (
                <ListRow
                  icon={icon(Car)}
                  title="Valet"
                  subtitle="Request & track your car"
                  onPress={() => navigation.navigate('Valet')}
                />
              ) : null}
              {digitalKey ? (
                <ListRow
                  icon={icon(KeyRound)}
                  title="Digital key"
                  subtitle="Unlock your room"
                  onPress={() => navigation.navigate('DigitalKey')}
                />
              ) : null}
          {games ? (
            <ListRow
              icon={icon(Gamepad2)}
              title="Games"
              subtitle="Catalog, jackpots & leaderboard"
              onPress={() => navigation.navigate('Games')}
            />
          ) : null}
          <ListRow
            icon={icon(MapPin)}
            title="Nearby"
            subtitle="Location-based offers"
            onPress={() => navigation.navigate('Nearby')}
          />
        </Card>

        {showSupport ? (
          <>
            <ThemedText variant="label" color="muted" style={styles.label}>
              Help
            </ThemedText>
            <Card style={styles.card}>
              <ListRow
                icon={icon(LifeBuoy)}
                title="Support"
                subtitle="Need help? Chat with us"
                onPress={() => navigation.navigate('Support')}
              />
            </Card>
          </>
        ) : null}

        <ThemedText variant="label" color="muted" style={styles.label}>
          Settings
        </ThemedText>
        <Card style={styles.card}>
          <ListRow
            icon={icon(ShieldCheck)}
            title="Security"
            subtitle="Biometric unlock & passcode"
            onPress={() => navigation.navigate('Security')}
          />
          <ListRow
            icon={icon(Bell)}
            title="Notifications"
            subtitle="Channels, quiet hours & location"
            onPress={() => navigation.navigate('NotificationPreferences')}
          />
          <ListRow
            icon={icon(Palette)}
            title="Appearance"
            subtitle="Theme & manifest"
            onPress={() => navigation.navigate('Appearance')}
          />
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 16, paddingBottom: 32 },
  label: { marginBottom: 8, marginTop: 12 },
  card: { marginBottom: 8 },
});
