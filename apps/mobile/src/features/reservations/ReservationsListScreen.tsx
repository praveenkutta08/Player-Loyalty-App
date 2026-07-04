import { CalendarPlus, Hotel, UtensilsCrossed, Wine } from 'lucide-react-native';
import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import {
  CapsLabel,
  GlassCard,
  HairlineRow,
  Kicker,
  PillButton,
  Screen,
  StatusPill,
  ThemedText,
} from '../../components';
import { withAlpha } from '../../theme/color';
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

/**
 * C10 — Reservations, re-skinned to obsidian luxury (RS6): a Playfair header, an indigo Book CTA,
 * and upcoming/past reservations as glass rows (type kicker + Playfair label, mono slot, status)
 * with 64px section gaps between lifestyle categories. Reservation/cancel flows are unchanged.
 */
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
        <Kicker color="secondary">Concierge · Reserve</Kicker>
        <ThemedText variant="display" style={styles.title}>
          Reservations
        </ThemedText>

        <PillButton
          label="Book a reservation"
          variant="accent"
          block
          icon={
            <CalendarPlus
              size={18}
              color={theme.colors.brand.onAccent ?? theme.colors.text.primary}
            />
          }
          onPress={() => navigation.navigate('ReservationBook')}
          testID="book-cta"
        />

        <Section title="Upcoming">
          {upcoming.length === 0 ? (
            <ThemedText variant="body" color="muted" style={styles.empty}>
              No upcoming reservations.
            </ThemedText>
          ) : (
            <GlassCard bare>
              {upcoming.map((r, i) => (
                <ReservationRow
                  key={r.id}
                  res={r}
                  divider={i < upcoming.length - 1}
                  onPress={() => navigation.navigate('ReservationDetail', { id: r.id })}
                />
              ))}
            </GlassCard>
          )}
        </Section>

        {past.length > 0 ? (
          <Section title="Past">
            <GlassCard bare>
              {past.map((r, i) => (
                <ReservationRow
                  key={r.id}
                  res={r}
                  divider={i < past.length - 1}
                  onPress={() => navigation.navigate('ReservationDetail', { id: r.id })}
                />
              ))}
            </GlassCard>
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
      <CapsLabel style={styles.sectionLabel}>{title}</CapsLabel>
      {children}
    </View>
  );
}

function ReservationRow({
  res,
  onPress,
  divider,
}: {
  res: ReservationOut;
  onPress: () => void;
  divider: boolean;
}): React.JSX.Element {
  const theme = useTheme();
  const c = theme.colors;
  const Icon = TYPE_ICON[res.type] ?? Hotel;
  return (
    <HairlineRow onPress={onPress} divider={divider} style={styles.row}>
      <View
        style={[
          styles.chip,
          {
            backgroundColor: withAlpha(c.brand.accent, 0.1),
            borderColor: c.border.ghost ?? c.border.strong,
          },
        ]}
      >
        <Icon size={18} color={c.brand.accent} />
      </View>
      <View style={styles.rowBody}>
        <ThemedText variant="title">{reservationTypeLabel(res.type)}</ThemedText>
        <ThemedText variant="mono" color="muted">
          {formatSlot(res.start_at)}
        </ThemedText>
      </View>
      <StatusPill label={res.status} tone={reservationTone(res.status)} />
    </HairlineRow>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 16, paddingBottom: 32 },
  title: { marginTop: 8, marginBottom: 24 },
  empty: { paddingVertical: 8 },
  section: { marginTop: 64 },
  sectionLabel: { marginBottom: 12 },
  row: { marginHorizontal: 16 },
  chip: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  rowBody: { flex: 1 },
});
