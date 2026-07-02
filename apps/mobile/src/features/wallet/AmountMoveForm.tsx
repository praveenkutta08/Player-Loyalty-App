import { CheckCircle2, XCircle } from 'lucide-react-native';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Input, StatusPill, ThemedText } from '../../components';
import { useTheme } from '../../theme/ThemeProvider';

import { formatMoney, parseAmountCents } from './money';
import { useMoneyMove } from './useMoneyMove';

const QUICK_ADD = [2000, 5000, 10000, 20000];

/**
 * Shared amount-entry + submit surface for deposit/withdraw/transfer. Owns validation (positive,
 * within an optional cap), the idempotency-keyed submit, and the pending → success/failure states.
 */
export function AmountMoveForm({
  ctaLabel,
  successMessage,
  balanceCents,
  maxCents,
  disabled = false,
  extra,
  perform,
  onDone,
}: {
  ctaLabel: string;
  successMessage: string;
  /** Shown as context (e.g. wallet balance). */
  balanceCents: number;
  /** Upper bound in cents (withdraw/transfer can't exceed the balance); omit for deposit. */
  maxCents?: number;
  /** Disable submit (e.g. no machine selected yet). */
  disabled?: boolean;
  /** Extra fields rendered above the amount (payment method, machine id, …). */
  extra?: React.ReactNode;
  perform: (amountCents: number, idempotencyKey: string) => Promise<unknown>;
  onDone: () => void;
}): React.JSX.Element {
  const theme = useTheme();
  const [raw, setRaw] = useState('');
  const { state, error, submit, reset } = useMoneyMove(perform);

  const amountCents = parseAmountCents(raw);
  const overCap = amountCents !== null && maxCents !== undefined && amountCents > maxCents;
  const canSubmit = amountCents !== null && !overCap && !disabled && state !== 'pending';

  if (state === 'success') {
    return (
      <Card style={styles.resultCard}>
        <CheckCircle2 size={48} color={theme.colors.state.success} />
        <ThemedText variant="h2" style={styles.resultTitle}>
          {successMessage}
        </ThemedText>
        <StatusPill label="Completed" tone="success" />
        <Button label="Done" style={styles.resultBtn} onPress={onDone} testID="move-done" />
      </Card>
    );
  }

  return (
    <View>
      {extra}

      <Input
        label="Amount"
        placeholder="0.00"
        keyboardType="decimal-pad"
        value={raw}
        onChangeText={(t) => setRaw(t)}
        error={
          overCap ? `Exceeds available ${formatMoney(maxCents ?? 0)}` : undefined
        }
      />

      <View style={styles.chips}>
        {QUICK_ADD.map((c) => (
          <Button
            key={c}
            label={`+${formatMoney(c)}`}
            variant="secondary"
            style={styles.chip}
            onPress={() => setRaw((((amountCents ?? 0) + c) / 100).toFixed(2))}
          />
        ))}
      </View>

      <ThemedText variant="label" color="muted" style={styles.balance}>
        Wallet balance {formatMoney(balanceCents)}
      </ThemedText>

      {state === 'failure' ? (
        <View style={styles.failure}>
          <XCircle size={18} color={theme.colors.state.error} />
          <ThemedText variant="body" style={{ color: theme.colors.state.error, marginLeft: 8, flex: 1 }}>
            {error}
          </ThemedText>
        </View>
      ) : null}

      <Button
        label={state === 'failure' ? `Retry ${ctaLabel.toLowerCase()}` : ctaLabel}
        loading={state === 'pending'}
        disabled={!canSubmit}
        onPress={() => amountCents !== null && void submit(amountCents)}
        testID="move-submit"
      />
      {state === 'failure' ? (
        <Button label="Start over" variant="secondary" style={styles.reset} onPress={reset} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, marginBottom: 4 },
  chip: { minWidth: 0 },
  balance: { marginVertical: 12 },
  failure: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  reset: { marginTop: 10 },
  resultCard: { alignItems: 'center', paddingVertical: 32 },
  resultTitle: { marginTop: 16, marginBottom: 12, textAlign: 'center' },
  resultBtn: { marginTop: 20, alignSelf: 'stretch' },
});
