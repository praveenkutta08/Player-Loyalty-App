import { Bell, CalendarDays, Car, KeyRound, Palette } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';

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
  const digitalKey = useFeature('digitalKey');
  const icon = (I: typeof CalendarDays) => <I size={20} color={theme.colors.text.secondary} />;

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {reservations || valet || digitalKey ? (
          <>
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
            </Card>
          </>
        ) : null}

        <ThemedText variant="label" color="muted" style={styles.label}>
          Settings
        </ThemedText>
        <Card style={styles.card}>
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
