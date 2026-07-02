import { CircleDollarSign, LogOut, Plus } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button, Card, Screen, StatusPill, ThemedText } from '../../components';
import { useTheme } from '../../theme/ThemeProvider';

import { formatMoney } from './money';
import { useGetTransactionsQuery, useGetWalletQuery } from './walletApi';

import type { WalletStackParamList } from './types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<WalletStackParamList, 'MachineSession'>;

/**
 * S4 — Machine session. "Active credits" is derived from the ledger (sum of transfers to this EGM),
 * never a local tally, so it stays truthful. From here the player tops up (transfer, S8) or cashes
 * out (S7); both go through the idempotent wallet API.
 */
export function MachineSessionScreen({ route, navigation }: Props): React.JSX.Element {
  const theme = useTheme();
  const { egmId, sessionId, pairedVia } = route.params;
  const wallet = useGetWalletQuery();
  const txns = useGetTransactionsQuery();

  const activeCredits = useMemo(
    () =>
      (txns.data ?? [])
        .filter((t) => t.type === 'transfer_to_egm' && t.egm_id === egmId)
        .reduce((sum, t) => sum + Math.abs(t.amount_cents), 0),
    [txns.data, egmId],
  );

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Card style={[styles.hero, { backgroundColor: theme.colors.brand.gold }]}>
          <View style={styles.heroHead}>
            <ThemedText variant="kicker" style={{ color: theme.colors.brand.onGold }}>
              Paired · {pairedVia === 'ble' ? 'Bluetooth' : 'QR'}
            </ThemedText>
            <StatusPill label="Connected" tone="success" />
          </View>
          <ThemedText variant="h2" style={{ color: theme.colors.brand.onGold }}>
            {egmId}
          </ThemedText>
          <ThemedText variant="label" style={{ color: theme.colors.brand.onGold }}>
            Session {sessionId.slice(0, 8)}
          </ThemedText>
        </Card>

        <Card style={styles.card}>
          <ThemedText variant="label" color="muted">
            Active credits on machine
          </ThemedText>
          <ThemedText variant="display">{formatMoney(activeCredits)}</ThemedText>
          <ThemedText variant="label" color="muted" style={styles.sub}>
            Wallet balance {formatMoney(wallet.data?.balance_cents ?? 0)}
          </ThemedText>
        </Card>

        <Button
          label="Transfer to machine"
          icon={<Plus size={18} color={theme.colors.brand.onGold} />}
          style={styles.action}
          onPress={() => navigation.navigate('Transfer', { egmId })}
          testID="session-transfer"
        />
        <Button
          label="Cash out"
          variant="secondary"
          icon={<CircleDollarSign size={18} color={theme.colors.text.primary} />}
          style={styles.action}
          onPress={() => navigation.navigate('Withdraw')}
        />
        <Button
          label="End session"
          variant="secondary"
          icon={<LogOut size={16} color={theme.colors.text.primary} />}
          style={styles.action}
          onPress={() => navigation.navigate('WalletHome')}
        />
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
  card: { marginBottom: 16 },
  sub: { marginTop: 8 },
  action: { marginTop: 10 },
});
