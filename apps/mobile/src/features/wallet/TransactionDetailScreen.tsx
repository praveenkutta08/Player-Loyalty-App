import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Card, Screen, StatusPill, ThemedText } from '../../components';
import { useTheme } from '../../theme/ThemeProvider';

import { formatMoney, formatTxnDate, txnLabel, txnTone } from './money';
import { useGetTransactionsQuery } from './walletApi';

import type { WalletStackParamList } from './types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<WalletStackParamList, 'TransactionDetail'>;

/** S9 (detail) — one ledger entry: amount, type, status, timestamp, machine + external reference. */
export function TransactionDetailScreen({ route }: Props): React.JSX.Element {
  const theme = useTheme();
  const { id } = route.params;
  const txn = useGetTransactionsQuery(undefined, {
    selectFromResult: ({ data }) => ({ data: data?.find((t) => t.id === id) }),
  }).data;

  if (!txn) {
    return (
      <Screen>
        <ThemedText variant="body" color="muted" style={styles.missing}>
          This transaction is no longer available.
        </ThemedText>
      </Screen>
    );
  }

  const credit = txn.amount_cents >= 0;

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Card style={styles.hero}>
          <ThemedText variant="label" color="muted">
            {txnLabel(txn.type)}
          </ThemedText>
          <ThemedText
            variant="display"
            style={{ color: credit ? theme.colors.state.success : theme.colors.text.primary }}
          >
            {credit ? '+' : ''}
            {formatMoney(txn.amount_cents)}
          </ThemedText>
          <StatusPill label={txn.status} tone={txnTone(txn.status)} />
        </Card>

        <Card>
          <Detail label="Date" value={formatTxnDate(txn.created_at)} />
          <Detail label="Type" value={txnLabel(txn.type)} />
          {txn.egm_id ? <Detail label="Machine" value={txn.egm_id} /> : null}
          {txn.external_ref ? <Detail label="Reference" value={txn.external_ref} /> : null}
          <Detail label="Transaction ID" value={txn.id} last />
        </Card>
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
        !last && { borderBottomColor: theme.colors.border.soft, borderBottomWidth: StyleSheet.hairlineWidth },
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
  missing: { marginTop: 24 },
});
