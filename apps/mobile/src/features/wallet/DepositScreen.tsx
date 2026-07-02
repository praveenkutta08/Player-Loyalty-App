import { ChevronRight, CreditCard } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { useAppSelector } from '../../app/store';
import { Card, ListRow, Screen, ThemedText } from '../../components';
import { useTheme } from '../../theme/ThemeProvider';

import { AmountMoveForm } from './AmountMoveForm';
import { useFundWalletMutation, useGetWalletQuery } from './walletApi';

import type { WalletStackParamList } from './types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<WalletStackParamList, 'Deposit'>;

/** S6 — Deposit / fund: choose a payment method (mock) + amount; funds via the idempotent API. */
export function DepositScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme();
  const wallet = useGetWalletQuery();
  const [fund] = useFundWalletMutation();
  const methods = useAppSelector((s) => s.paymentMethods.methods);
  const method = methods[0];

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <AmountMoveForm
          ctaLabel="Deposit"
          successMessage="Deposit complete"
          balanceCents={wallet.data?.balance_cents ?? 0}
          disabled={!method}
          perform={(amountCents, idempotencyKey) => fund({ amountCents, idempotencyKey }).unwrap()}
          onDone={() => navigation.navigate('WalletHome')}
          extra={
            <Card style={styles.method}>
              <ThemedText variant="label" color="muted">
                Pay with
              </ThemedText>
              <ListRow
                icon={<CreditCard size={20} color={theme.colors.text.secondary} />}
                title={method ? `${method.brand} •••• ${method.last4}` : 'Add a payment method'}
                subtitle={method ? `Expires ${method.exp}` : 'No card on file'}
                value={method ? 'Change' : undefined}
                onPress={() => navigation.navigate('PaymentMethods')}
              />
              {!method ? (
                <ThemedText variant="label" color="muted" style={styles.hint}>
                  <ChevronRight size={12} color={theme.colors.text.muted} /> Add a card to deposit.
                </ThemedText>
              ) : null}
            </Card>
          }
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 16, paddingBottom: 32 },
  method: { marginBottom: 20 },
  hint: { marginTop: 8 },
});
