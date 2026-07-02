import { ShieldCheck } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button, Card, Screen, StatusPill, ThemedText } from '../../components';
import { useTheme } from '../../theme/ThemeProvider';
import { errorMessage } from '../auth/errors';

import { useGetAccountMeQuery, useStartKycMutation } from './accountApi';
import { kycView } from './kyc';

/**
 * A9 — KYC verification. Reads the current status from `/me` and advances the KycPort mock via
 * `POST /account/kyc/start`; the mutation invalidates the Player tag so `/me` refreshes with the
 * new status. Terminal states (verified / referred / rejected) drive the copy + action.
 */
export function KycScreen(): React.JSX.Element {
  const theme = useTheme();
  const me = useGetAccountMeQuery();
  const [startKyc, { isLoading, error }] = useStartKycMutation();
  const view = kycView(me.data?.kyc_status);

  const onStart = async (): Promise<void> => {
    try {
      await startKyc().unwrap();
    } catch {
      // surfaced below
    }
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={[styles.badge, { backgroundColor: theme.colors.bg.surface }]}>
            <ShieldCheck size={40} color={theme.colors.brand.gold} />
          </View>
          <ThemedText variant="h1" style={styles.title}>
            Identity verification
          </ThemedText>
          <StatusPill label={view.label} tone={view.tone} />
        </View>

        <Card style={styles.card}>
          <ThemedText variant="body" color="secondary">
            {view.description}
          </ThemedText>
        </Card>

        <Card style={styles.card}>
          <ThemedText variant="label" color="muted">
            Why we verify
          </ThemedText>
          <ThemedText variant="body" color="secondary" style={styles.why}>
            Verification keeps your account secure and unlocks cashless play, wallet funding, and
            withdrawals. It's required by gaming regulations and only takes a few minutes.
          </ThemedText>
        </Card>

        {error ? (
          <ThemedText variant="body" style={[styles.error, { color: theme.colors.state.error }]}>
            {errorMessage(error, 'Could not start verification. Please try again.')}
          </ThemedText>
        ) : null}

        {view.canStart ? (
          <Button
            label={me.data?.kyc_status ? 'Restart verification' : 'Start verification'}
            onPress={() => void onStart()}
            loading={isLoading || me.isFetching}
          />
        ) : (
          <ThemedText variant="body" color="muted" style={styles.footnote}>
            No action needed right now.
          </ThemedText>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 24, paddingBottom: 32 },
  hero: { alignItems: 'center', marginBottom: 24 },
  badge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { marginBottom: 12 },
  card: { marginBottom: 16 },
  why: { marginTop: 8 },
  error: { marginBottom: 12, textAlign: 'center' },
  footnote: { textAlign: 'center', marginTop: 8 },
});
