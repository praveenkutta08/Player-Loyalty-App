import { ArrowDownLeft, ArrowUpRight, RotateCcw, Send } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CapsLabel, ThemedText } from '../../components';
import { withAlpha } from '../../theme/color';
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

/**
 * One ledger entry as an obsidian utility row (RS3): an indigo-tinted icon chip, the type label +
 * timestamp (utility-mono) on the left, and the signed amount on the right — credit in indigo,
 * debit in soft red — with a caps status when it isn't a plain completed credit.
 */
export function TransactionRow({
  txn,
  onPress,
}: {
  txn: WalletTransactionOut;
  onPress?: () => void;
}): React.JSX.Element {
  const theme = useTheme();
  const c = theme.colors;
  const Icon = ICONS[txn.type] ?? ArrowDownLeft;
  const credit = txn.amount_cents >= 0;
  const failed = txn.status === 'failed';
  const amountColor = failed
    ? c.text.muted
    : credit
      ? (c.state.credit ?? c.brand.accent)
      : (c.state.debit ?? c.state.error);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={[styles.row, { borderBottomColor: c.border.ghost ?? c.border.soft }]}
    >
      <View
        style={[
          styles.icon,
          {
            backgroundColor: withAlpha(c.brand.accent, 0.1),
            borderColor: c.border.ghost ?? c.border.strong,
          },
        ]}
      >
        <Icon size={18} color={c.brand.accent} />
      </View>
      <View style={styles.body}>
        <ThemedText variant="title">{txnLabel(txn.type)}</ThemedText>
        <ThemedText variant="mono" color="muted">
          {txn.egm_id ? `${txn.egm_id} · ` : ''}
          {formatTxnDate(txn.created_at)}
        </ThemedText>
      </View>
      <View style={styles.right}>
        <ThemedText variant="title" style={{ color: amountColor }}>
          {credit ? '+' : ''}
          {formatMoney(txn.amount_cents)}
        </ThemedText>
        {failed ? (
          <CapsLabel style={{ color: c.state.error }}>Failed</CapsLabel>
        ) : txn.status !== 'completed' ? (
          <CapsLabel color="muted">{txn.status}</CapsLabel>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  body: { flex: 1 },
  right: { alignItems: 'flex-end', gap: 4 },
});
