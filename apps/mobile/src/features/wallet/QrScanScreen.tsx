import { QrCode, ScanLine } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button, Card, Input, Screen, StatusPill, ThemedText } from '../../components';
import { useTheme } from '../../theme/ThemeProvider';

import { parseMachineQr } from './qr';
import { usePairEgm } from './usePairEgm';

import type { WalletStackParamList } from './types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<WalletStackParamList, 'QrScan'>;

/**
 * S3 — QR pairing fallback. The camera is mocked (no native camera in the MVP): "Simulate scan"
 * feeds a sample machine QR, and the player can also type a code by hand. Both go through the same
 * parse → pair path as a real scan would.
 */
export function QrScanScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme();
  const [code, setCode] = useState('');
  const [invalid, setInvalid] = useState(false);
  const { pair, pairing, error } = usePairEgm('qr', navigation);

  function submit(payload: string): void {
    const egmId = parseMachineQr(payload);
    if (!egmId) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    void pair(egmId);
  }

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Mocked viewfinder */}
        <View style={[styles.viewfinder, { borderColor: theme.colors.border.strong }]}>
          <ScanLine size={64} color={theme.colors.text.muted} />
          <ThemedText variant="label" color="muted" style={styles.viewfinderText}>
            Point at the QR code on the machine
          </ThemedText>
        </View>

        <Button
          label="Simulate scan"
          icon={<QrCode size={18} color={theme.colors.brand.onGold} />}
          loading={pairing}
          onPress={() => submit('casino://egm/EGM-2087')}
          testID="qr-simulate"
        />

        <ThemedText variant="label" color="muted" style={styles.orLabel}>
          Or enter the machine code
        </ThemedText>
        <Card style={styles.card}>
          <Input
            label="Machine code"
            placeholder="EGM-1042"
            autoCapitalize="characters"
            autoCorrect={false}
            value={code}
            onChangeText={(t) => {
              setCode(t);
              setInvalid(false);
            }}
            error={invalid ? 'That doesn’t look like a machine code.' : undefined}
          />
          <Button
            label="Pair"
            variant="secondary"
            style={styles.pair}
            disabled={pairing || code.trim().length === 0}
            onPress={() => submit(code)}
            testID="qr-pair"
          />
        </Card>

        {error ? <StatusPill label={error} tone="error" /> : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 16, paddingBottom: 32 },
  viewfinder: {
    height: 220,
    borderWidth: 2,
    borderRadius: 20,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  viewfinderText: { marginTop: 12 },
  orLabel: { marginTop: 20, marginBottom: 8 },
  card: { marginBottom: 16 },
  pair: { marginTop: 12, alignSelf: 'flex-start' },
});
