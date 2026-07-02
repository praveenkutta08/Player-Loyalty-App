import { Bluetooth, QrCode, Wallet as WalletIcon } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useFeature } from '../../app/providers/FeatureProvider';
import { Button, Card, Screen, ThemedText } from '../../components';
import { useTheme } from '../../theme/ThemeProvider';

import { formatMoney } from './money';
import { useGetWalletQuery } from './walletApi';

import type { WalletStackParamList } from './types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<WalletStackParamList, 'ScanPlay'>;

/**
 * S1 — Scan/Play entry. With the `cardless` flag on, the player pairs to a machine over BLE or by
 * QR; with it off we fall back to the Wallet only (no cardless play for that tenant).
 */
export function ScanPlayScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme();
  const cashless = useFeature('cardless');
  const wallet = useGetWalletQuery();
  const balance = wallet.data?.balance_cents ?? 0;

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Card style={styles.balanceCard}>
          <ThemedText variant="label" color="muted">
            Wallet balance
          </ThemedText>
          <ThemedText variant="display">{formatMoney(balance)}</ThemedText>
          <Button
            label="Open wallet"
            variant="secondary"
            style={styles.walletBtn}
            onPress={() => navigation.navigate('WalletHome')}
          />
        </Card>

        {cashless ? (
          <>
            <ThemedText variant="label" color="muted" style={styles.sectionLabel}>
              Pair to play
            </ThemedText>
            <Card style={styles.card}>
              <ThemedText variant="title">Cardless play</ThemedText>
              <ThemedText variant="body" color="muted" style={styles.hint}>
                Find your machine over Bluetooth, or scan the QR code on the screen.
              </ThemedText>
              <Button
                label="Find nearby machines"
                icon={<Bluetooth size={18} color={theme.colors.brand.onGold} />}
                style={styles.action}
                onPress={() => navigation.navigate('BlePairing')}
                testID="scan-ble"
              />
              <Button
                label="Scan QR code"
                variant="secondary"
                icon={<QrCode size={18} color={theme.colors.text.primary} />}
                style={styles.action}
                onPress={() => navigation.navigate('QrScan')}
                testID="scan-qr"
              />
            </Card>
          </>
        ) : (
          <Card style={styles.card}>
            <View style={styles.fallbackHead}>
              <WalletIcon size={20} color={theme.colors.brand.gold} />
              <ThemedText variant="title" style={styles.fallbackTitle}>
                Wallet
              </ThemedText>
            </View>
            <ThemedText variant="body" color="muted" style={styles.hint}>
              Cardless play isn&apos;t available here. Manage funds and history in your wallet.
            </ThemedText>
            <Button
              label="Go to wallet"
              style={styles.action}
              onPress={() => navigation.navigate('WalletHome')}
            />
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 16, paddingBottom: 32 },
  balanceCard: { marginBottom: 20 },
  walletBtn: { marginTop: 12, alignSelf: 'flex-start' },
  sectionLabel: { marginBottom: 8 },
  card: { marginBottom: 16 },
  hint: { marginTop: 4, marginBottom: 12 },
  action: { marginTop: 10 },
  fallbackHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  fallbackTitle: { marginLeft: 8 },
});
