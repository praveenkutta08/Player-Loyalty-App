import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button, Card, Screen, StatusPill, ThemedText } from '../../components';
import { useTheme } from '../../theme/ThemeProvider';

import { formatSlot, isUpcoming, reservationTone, reservationTypeLabel } from './format';
import { useCancelReservationMutation, useGetReservationQuery } from './reservationsApi';

import type { MoreStackParamList } from '../more/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<MoreStackParamList, 'ReservationDetail'>;

/** C12 — Reservation detail: view + cancel an upcoming booking. */
export function ReservationDetailScreen({ route, navigation }: Props): React.JSX.Element {
  const { id } = route.params;
  const q = useGetReservationQuery(id);
  const [cancel, { isLoading: cancelling }] = useCancelReservationMutation();
  const res = q.data;

  if (!res) {
    return (
      <Screen>
        <ThemedText variant="body" color="muted" style={styles.missing}>
          {q.isLoading ? 'Loading…' : 'Reservation not found.'}
        </ThemedText>
      </Screen>
    );
  }

  async function doCancel(): Promise<void> {
    try {
      await cancel(id).unwrap();
      navigation.goBack();
    } catch {
      /* stays on screen; status query reflects server truth */
    }
  }

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Card style={styles.hero}>
          <ThemedText variant="label" color="muted">
            {reservationTypeLabel(res.type)}
          </ThemedText>
          <ThemedText variant="h2">{formatSlot(res.start_at)}</ThemedText>
          <StatusPill label={res.status} tone={reservationTone(res.status)} />
        </Card>

        <Card>
          <Detail label="Confirmation" value={res.external_ref ?? '—'} />
          {res.notes ? <Detail label="Notes" value={res.notes} /> : null}
          <Detail label="Ends" value={formatSlot(res.end_at)} last />
        </Card>

        {isUpcoming(res.status) ? (
          <Button
            label="Cancel reservation"
            variant="secondary"
            loading={cancelling}
            style={styles.cancel}
            onPress={() => void doCancel()}
            testID="cancel-reservation"
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function Detail({ label, value, last }: { label: string; value: string; last?: boolean }): React.JSX.Element {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.detail,
        !last && {
          borderBottomColor: theme.colors.border.soft,
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
      ]}
    >
      <ThemedText variant="label" color="muted">
        {label}
      </ThemedText>
      <ThemedText variant="body" style={styles.detailValue}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 16, paddingBottom: 32 },
  hero: { marginBottom: 16, alignItems: 'flex-start' },
  detail: { paddingVertical: 12 },
  detailValue: { marginTop: 2 },
  cancel: { marginTop: 20 },
  missing: { marginTop: 24 },
});
