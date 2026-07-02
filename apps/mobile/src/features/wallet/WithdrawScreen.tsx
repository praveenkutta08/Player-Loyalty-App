import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { Screen, ThemedText } from '../../components';

import { AmountMoveForm } from './AmountMoveForm';
import { useCashoutMutation, useGetWalletQuery } from './walletApi';

import type { WalletStackParamList } from './types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<WalletStackParamList, 'Withdraw'>;

/** S7 — Withdraw / cash-out: move funds out of the wallet, capped at the available balance. */
export function WithdrawScreen({ navigation }: Props): React.JSX.Element {
  const wallet = useGetWalletQuery();
  const [cashout] = useCashoutMutation();
  const balance = wallet.data?.balance_cents ?? 0;

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <ThemedText variant="body" color="muted" style={styles.intro}>
          Cash out to your linked account. Funds settle instantly in this demo.
        </ThemedText>
        <AmountMoveForm
          ctaLabel="Cash out"
          successMessage="Cash-out complete"
          balanceCents={balance}
          maxCents={balance}
          perform={(amountCents, idempotencyKey) =>
            cashout({ amountCents, idempotencyKey }).unwrap()
          }
          onDone={() => navigation.navigate('WalletHome')}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 16, paddingBottom: 32 },
  intro: { marginBottom: 16 },
});
