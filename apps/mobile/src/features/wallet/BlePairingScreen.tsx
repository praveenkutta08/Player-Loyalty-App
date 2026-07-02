import { Bluetooth, RefreshCw, Wifi } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button, Card, Screen, StatusPill, ThemedText } from '../../components';
import { ble } from '../../native/ble';
import { useTheme } from '../../theme/ThemeProvider';

import { usePairEgm } from './usePairEgm';

import type { WalletStackParamList } from './types';
import type { BleMachine } from '../../native/ble';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<WalletStackParamList, 'BlePairing'>;

/** S2 — BLE pairing: scan the (simulated) advertising machines and connect to one. */
export function BlePairingScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme();
  const [scanning, setScanning] = useState(false);
  const [machines, setMachines] = useState<BleMachine[]>([]);
  const { pair, pairing, connectingId, error } = usePairEgm('ble', navigation);

  const scan = useCallback(async () => {
    setScanning(true);
    setMachines([]);
    const found = await ble.scanForMachines();
    setMachines(found);
    setScanning(false);
  }, []);

  useEffect(() => {
    void scan();
  }, [scan]);

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Bluetooth size={20} color={theme.colors.brand.gold} />
          <ThemedText variant="title" style={styles.headerText}>
            {scanning ? 'Scanning…' : `${machines.length} machines nearby`}
          </ThemedText>
          {scanning ? <ActivityIndicator color={theme.colors.brand.gold} /> : null}
        </View>

        {error ? <StatusPill label={error} tone="error" /> : null}

        <Card style={styles.card}>
          {machines.map((m) => (
            <Pressable
              key={m.id}
              disabled={pairing}
              onPress={() => void pair(m.id)}
              accessibilityRole="button"
              testID={`ble-machine-${m.id}`}
              style={[styles.row, { borderBottomColor: theme.colors.border.soft }]}
            >
              <Wifi size={18} color={theme.colors.text.secondary} />
              <View style={styles.rowBody}>
                <ThemedText variant="title">{m.name}</ThemedText>
                <ThemedText variant="label" color="muted">
                  {m.id} · {signalLabel(m.rssi)}
                </ThemedText>
              </View>
              {connectingId === m.id ? (
                <ActivityIndicator color={theme.colors.brand.gold} />
              ) : (
                <ThemedText variant="label" color="secondary">
                  Connect
                </ThemedText>
              )}
            </Pressable>
          ))}
          {!scanning && machines.length === 0 ? (
            <ThemedText variant="body" color="muted">
              No machines found. Move closer and rescan.
            </ThemedText>
          ) : null}
        </Card>

        <Button
          label="Rescan"
          variant="secondary"
          icon={<RefreshCw size={16} color={theme.colors.text.primary} />}
          disabled={scanning || pairing}
          onPress={() => void scan()}
        />
        <Button
          label="Use QR instead"
          variant="secondary"
          style={styles.qr}
          onPress={() => navigation.replace('QrScan')}
        />
      </ScrollView>
    </Screen>
  );
}

/** Coarse signal buckets from RSSI dBm, for a friendly proximity hint. */
function signalLabel(rssi: number): string {
  if (rssi >= -55) return 'Strong signal';
  if (rssi >= -68) return 'Good signal';
  return 'Weak signal';
}

const styles = StyleSheet.create({
  content: { paddingVertical: 16, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  headerText: { flex: 1, marginLeft: 8 },
  card: { marginBottom: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowBody: { flex: 1, marginLeft: 12 },
  qr: { marginTop: 10 },
});
