import { Cpu } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Card, Input, Screen, ThemedText } from '../../components';
import { useTheme } from '../../theme/ThemeProvider';

import { AmountMoveForm } from './AmountMoveForm';
import { parseMachineQr } from './qr';
import { useGetWalletQuery, useTransferToEgmMutation } from './walletApi';

import type { WalletStackParamList } from './types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<WalletStackParamList, 'Transfer'>;

/**
 * S8 — Transfer to a machine. Pre-filled with the paired EGM when arriving from a session (S4);
 * otherwise the player types a machine code. Capped at the wallet balance; idempotent submit.
 */
export function TransferScreen({ route, navigation }: Props): React.JSX.Element {
  const theme = useTheme();
  const paired = route.params?.egmId;
  const [typed, setTyped] = useState('');
  const wallet = useGetWalletQuery();
  const [transfer] = useTransferToEgmMutation();
  const balance = wallet.data?.balance_cents ?? 0;

  const egmId = paired ?? parseMachineQr(typed);

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <AmountMoveForm
          ctaLabel="Transfer"
          successMessage="Transferred to machine"
          balanceCents={balance}
          maxCents={balance}
          disabled={!egmId}
          perform={(amountCents, idempotencyKey) =>
            transfer({ amountCents, egmId: egmId as string, idempotencyKey }).unwrap()
          }
          onDone={() => navigation.navigate('WalletHome')}
          extra={
            <Card style={styles.machine}>
              <View style={styles.head}>
                <Cpu size={18} color={theme.colors.brand.gold} />
                <ThemedText variant="label" color="muted" style={styles.headText}>
                  Machine
                </ThemedText>
              </View>
              {paired ? (
                <ThemedText variant="title">{paired}</ThemedText>
              ) : (
                <Input
                  placeholder="EGM-1042"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  value={typed}
                  onChangeText={setTyped}
                  error={typed.length > 0 && !egmId ? 'Enter a valid machine code.' : undefined}
                />
              )}
            </Card>
          }
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 16, paddingBottom: 32 },
  machine: { marginBottom: 20 },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  headText: { marginLeft: 8 },
});
