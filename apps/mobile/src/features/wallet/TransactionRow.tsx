import { ArrowDownLeft, ArrowUpRight, RotateCcw, Send } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { StatusPill, ThemedText } from '../../components';
import { useTheme } from '../../theme/ThemeProvider';

import { formatMoney, formatTxnDate, txnLabel } from './money';

import type { WalletTransactionOut } from './walletApi';
import type { LucideIcon } from 'lucide-react-native';

const ICONS: Record<string, LucideIcon> = {
  fund: ArrowDownLeft,
  transfer_to_egm: Send,
  cashout: ArrowUpRight,
  refund: RotateCcw,
};

/** One ledger entry: type icon + label + date on the left, signed amount (+ failure pill) right. */
export function TransactionRow({
  txn,
  onPress,
}: {
  txn: WalletTransactionOut;
  onPress?: () => void;
}): React.JSX.Element {
  const theme = useTheme();
  const Icon = ICONS[txn.type] ?? ArrowDownLeft;
  const credit = txn.amount_cents >= 0;
  const failed = txn.status === 'failed';
  const amountColor = failed
    ? theme.colors.text.muted
    : credit
      ? theme.colors.state.success
      : theme.colors.text.primary;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={[styles.row, { borderBottomColor: theme.colors.border.soft }]}
    >
      <View style={[styles.icon, { backgroundColor: theme.colors.bg.base }]}>
        <Icon size={18} color={theme.colors.text.secondary} />
      </View>
      <View style={styles.body}>
        <ThemedText variant="title">{txnLabel(txn.type)}</ThemedText>
        <ThemedText variant="label" color="muted">
          {txn.egm_id ? `${txn.egm_id} · ` : ''}
          {formatTxnDate(txn.created_at)}
        </ThemedText>
      </View>
      <View style={styles.right}>
        <ThemedText variant="title" style={{ color: amountColor }}>
          {credit ? '+' : ''}
          {formatMoney(txn.amount_cents)}
        </ThemedText>
        {failed ? <StatusPill label="failed" tone="error" /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  body: { flex: 1 },
  right: { alignItems: 'flex-end' },
});
