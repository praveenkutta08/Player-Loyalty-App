import { ArrowDownToLine, ArrowUpFromLine, CreditCard, Send } from 'lucide-react-native';
import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { Button, Card, ListRow, Screen, StatusPill, ThemedText } from '../../components';
import { useTheme } from '../../theme/ThemeProvider';

import { formatMoney } from './money';
import { TransactionRow } from './TransactionRow';
import { useGetTransactionsQuery, useGetWalletQuery } from './walletApi';

import type { WalletStackParamList } from './types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<WalletStackParamList, 'WalletHome'>;

/** S5 — Wallet home: balance, money actions (deposit/withdraw/transfer), and recent ledger rows. */
export function WalletHomeScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme();
  const wallet = useGetWalletQuery();
  const txns = useGetTransactionsQuery();
  const recent = (txns.data ?? []).slice(0, 5);
  const refreshing = wallet.isFetching || txns.isFetching;

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void wallet.refetch();
              void txns.refetch();
            }}
          />
        }
      >
        <Card style={[styles.hero, { backgroundColor: theme.colors.brand.gold }]}>
          <ThemedText variant="kicker" style={{ color: theme.colors.brand.onGold }}>
            Wallet balance
          </ThemedText>
          <ThemedText variant="display" style={{ color: theme.colors.brand.onGold }}>
            {formatMoney(wallet.data?.balance_cents ?? 0)}
          </ThemedText>
          {wallet.data?.status && wallet.data.status !== 'active' ? (
            <StatusPill label={wallet.data.status} tone="warning" />
          ) : null}
        </Card>

        <View style={styles.actions}>
          <Button
            label="Deposit"
            icon={<ArrowDownToLine size={18} color={theme.colors.brand.onGold} />}
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Deposit')}
            testID="wallet-deposit"
          />
          <Button
            label="Withdraw"
            variant="secondary"
            icon={<ArrowUpFromLine size={18} color={theme.colors.text.primary} />}
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Withdraw')}
          />
        </View>
        <Button
          label="Transfer to a machine"
          variant="secondary"
          icon={<Send size={18} color={theme.colors.text.primary} />}
          style={styles.transfer}
          onPress={() => navigation.navigate('Transfer')}
        />

        <ListRow
          icon={<CreditCard size={20} color={theme.colors.text.secondary} />}
          title="Payment methods"
          subtitle="Manage saved cards"
          onPress={() => navigation.navigate('PaymentMethods')}
        />

        <View style={styles.recentHead}>
          <ThemedText variant="label" color="muted">
            Recent activity
          </ThemedText>
          {recent.length > 0 ? (
            <ThemedText
              variant="label"
              color="secondary"
              onPress={() => navigation.navigate('TransactionHistory')}
            >
              See all
            </ThemedText>
          ) : null}
        </View>
        <Card style={styles.card}>
          {recent.length === 0 ? (
            <ThemedText variant="body" color="muted">
              No transactions yet. Make a deposit to get started.
            </ThemedText>
          ) : (
            recent.map((t) => (
              <TransactionRow
                key={t.id}
                txn={t}
                onPress={() => navigation.navigate('TransactionDetail', { id: t.id })}
              />
            ))
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 16, paddingBottom: 32 },
  hero: { marginBottom: 16 },
  actions: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1 },
  transfer: { marginTop: 12, marginBottom: 8 },
  recentHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 8,
  },
  card: { marginBottom: 16 },
});
