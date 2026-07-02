import { CalendarPlus, Hotel, UtensilsCrossed, Wine } from 'lucide-react-native';
import React from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { Button, Card, Screen, StatusPill, ThemedText } from '../../components';
import { useTheme } from '../../theme/ThemeProvider';

import { formatSlot, isUpcoming, reservationTone, reservationTypeLabel } from './format';
import { useGetReservationsQuery } from './reservationsApi';

import type { ReservationOut } from './reservationsApi';
import type { MoreStackParamList } from '../more/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { LucideIcon } from 'lucide-react-native';

type Props = NativeStackScreenProps<MoreStackParamList, 'Reservations'>;

const TYPE_ICON: Record<string, LucideIcon> = {
  hotel: Hotel,
  dining: UtensilsCrossed,
  nightlife: Wine,
};

/** C10 — Reservations list: upcoming + past, with a Book CTA. */
export function ReservationsListScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme();
  const q = useGetReservationsQuery();
  const items = q.data ?? [];
  const upcoming = items.filter((r) => isUpcoming(r.status));
  const past = items.filter((r) => !isUpcoming(r.status));

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={q.isFetching} onRefresh={() => void q.refetch()} />
        }
      >
        <Button
          label="Book a reservation"
          icon={<CalendarPlus size={18} color={theme.colors.brand.onGold} />}
          onPress={() => navigation.navigate('ReservationBook')}
          testID="book-cta"
        />

        <Section title="Upcoming">
          {upcoming.length === 0 ? (
            <ThemedText variant="body" color="muted">
              No upcoming reservations.
            </ThemedText>
          ) : (
            upcoming.map((r) => (
              <ReservationRow
                key={r.id}
                res={r}
                onPress={() => navigation.navigate('ReservationDetail', { id: r.id })}
              />
            ))
          )}
        </Section>

        {past.length > 0 ? (
          <Section title="Past">
            {past.map((r) => (
              <ReservationRow
                key={r.id}
                res={r}
                onPress={() => navigation.navigate('ReservationDetail', { id: r.id })}
              />
            ))}
          </Section>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View style={styles.section}>
      <ThemedText variant="label" color="muted" style={styles.sectionLabel}>
        {title}
      </ThemedText>
      <Card>{children}</Card>
    </View>
  );
}

function ReservationRow({
  res,
  onPress,
}: {
  res: ReservationOut;
  onPress: () => void;
}): React.JSX.Element {
  const theme = useTheme();
  const Icon = TYPE_ICON[res.type] ?? Hotel;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[styles.row, { borderBottomColor: theme.colors.border.soft }]}
    >
      <Icon size={20} color={theme.colors.text.secondary} />
      <View style={styles.rowBody}>
        <ThemedText variant="title">{reservationTypeLabel(res.type)}</ThemedText>
        <ThemedText variant="label" color="muted">
          {formatSlot(res.start_at)}
        </ThemedText>
      </View>
      <StatusPill label={res.status} tone={reservationTone(res.status)} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 16, paddingBottom: 32 },
  section: { marginTop: 20 },
  sectionLabel: { marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowBody: { flex: 1, marginLeft: 12 },
});
