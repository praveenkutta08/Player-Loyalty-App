import { CheckCircle2, Hotel, UtensilsCrossed, Wine } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button, Card, Input, Screen, StatusPill, ThemedText } from '../../components';
import { useTheme } from '../../theme/ThemeProvider';

import { reservationTypeLabel } from './format';
import { useBookReservationMutation } from './reservationsApi';

import type { ReservationType } from './reservationsApi';
import type { MoreStackParamList } from '../more/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { LucideIcon } from 'lucide-react-native';

type Props = NativeStackScreenProps<MoreStackParamList, 'ReservationBook'>;

const TYPES: { key: ReservationType; icon: LucideIcon; blurb: string }[] = [
  { key: 'hotel', icon: Hotel, blurb: 'Suites & rooms' },
  { key: 'dining', icon: UtensilsCrossed, blurb: 'Restaurants & bars' },
  { key: 'nightlife', icon: Wine, blurb: 'Clubs & lounges' },
];

/** C11 — Reservation book: pick a category (mock catalog) + note, then book against the API. */
export function ReservationBookScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme();
  const [type, setType] = useState<ReservationType>('dining');
  const [notes, setNotes] = useState('');
  const [book, { isLoading, isSuccess, isError }] = useBookReservationMutation();

  async function submit(): Promise<void> {
    try {
      await book({ type, notes: notes.trim() || null }).unwrap();
    } catch {
      /* surfaced via isError below */
    }
  }

  if (isSuccess) {
    return (
      <Screen>
        <Card style={styles.result}>
          <CheckCircle2 size={48} color={theme.colors.state.success} />
          <ThemedText variant="h2" style={styles.resultTitle}>
            {reservationTypeLabel(type)} reservation confirmed
          </ThemedText>
          <Button
            label="View reservations"
            style={styles.resultBtn}
            onPress={() => navigation.navigate('Reservations')}
          />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <ThemedText variant="label" color="muted" style={styles.label}>
          Category
        </ThemedText>
        <View style={styles.types}>
          {TYPES.map(({ key, icon: Icon, blurb }) => {
            const active = key === type;
            return (
              <Pressable
                key={key}
                onPress={() => setType(key)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                testID={`type-${key}`}
                style={[
                  styles.type,
                  {
                    borderColor: active ? theme.colors.brand.gold : theme.colors.border.default,
                    backgroundColor: active ? theme.colors.bg.surface : 'transparent',
                  },
                ]}
              >
                <Icon
                  size={22}
                  color={active ? theme.colors.brand.gold : theme.colors.text.secondary}
                />
                <ThemedText variant="title" style={styles.typeLabel}>
                  {reservationTypeLabel(key)}
                </ThemedText>
                <ThemedText variant="label" color="muted">
                  {blurb}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        <Input
          label="Notes (optional)"
          placeholder="Party size, seating, occasion…"
          value={notes}
          onChangeText={setNotes}
          multiline
          containerStyle={styles.notes}
        />

        {isError ? <StatusPill label="Booking failed — try again" tone="error" /> : null}

        <Button
          label="Confirm booking"
          loading={isLoading}
          style={styles.submit}
          onPress={() => void submit()}
          testID="confirm-book"
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 16, paddingBottom: 32 },
  label: { marginBottom: 8 },
  types: { gap: 10 },
  type: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: 14,
    padding: 14,
  },
  typeLabel: { marginTop: 8 },
  notes: { marginTop: 20 },
  submit: { marginTop: 20 },
  result: { alignItems: 'center', paddingVertical: 32, marginTop: 24 },
  resultTitle: { marginTop: 16, marginBottom: 20, textAlign: 'center' },
  resultBtn: { alignSelf: 'stretch' },
});
