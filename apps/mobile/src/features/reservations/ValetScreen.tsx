import { Car } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button, Card, Screen, StatusPill, ThemedText } from '../../components';
import { useTheme } from '../../theme/ThemeProvider';

import { valetTone } from './format';
import { useGetValetQuery, useRequestValetMutation } from './reservationsApi';

/** C13 — Valet: request the car and track the ticket status (polls the detail endpoint). */
export function ValetScreen(): React.JSX.Element {
  const theme = useTheme();
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [request, { isLoading }] = useRequestValetMutation();
  // Poll the ticket status every 5s once a request exists.
  const ticket = useGetValetQuery(ticketId as string, {
    skip: !ticketId,
    pollingInterval: 5000,
  });

  async function requestCar(): Promise<void> {
    try {
      const created = await request().unwrap();
      setTicketId(created.id);
    } catch {
      /* no ticket set; button stays available to retry */
    }
  }

  const status = ticket.data?.status;

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Card style={styles.hero}>
          <View style={styles.heroHead}>
            <Car size={24} color={theme.colors.brand.gold} />
            {status ? <StatusPill label={status} tone={valetTone(status)} /> : null}
          </View>
          <ThemedText variant="h2" style={styles.heroTitle}>
            {ticketId ? 'Your car is on the way' : 'Request valet'}
          </ThemedText>
          <ThemedText variant="body" color="muted">
            {ticketId
              ? `Ticket ${ticket.data?.ticket_ref ?? ''} · we’ll update the status here.`
              : 'Have your car brought to the valet stand.'}
          </ThemedText>
        </Card>

        {status === 'ready' ? (
          <Card style={styles.ready} background="surface">
            <ThemedText variant="title" style={{ color: theme.colors.state.success }}>
              Ready for pickup
            </ThemedText>
            <ThemedText variant="body" color="muted">
              Your vehicle is waiting at the valet stand.
            </ThemedText>
          </Card>
        ) : null}

        {!ticketId ? (
          <Button
            label="Request my car"
            loading={isLoading}
            onPress={() => void requestCar()}
            testID="request-valet"
          />
        ) : (
          <Button
            label="Refresh status"
            variant="secondary"
            loading={ticket.isFetching}
            onPress={() => void ticket.refetch()}
          />
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 16, paddingBottom: 32 },
  hero: { marginBottom: 16 },
  heroHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  heroTitle: { marginBottom: 4 },
  ready: { marginBottom: 16 },
});
