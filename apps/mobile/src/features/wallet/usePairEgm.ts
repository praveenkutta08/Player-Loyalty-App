import { useState } from 'react';

import { ble } from '../../native/ble';

import { usePairEgmMutation } from './walletApi';

import type { WalletStackParamList } from './types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

/** Only `replace` is needed here; narrowing avoids per-screen route-generic mismatches. */
type WalletNav = Pick<NativeStackNavigationProp<WalletStackParamList>, 'replace'>;

/**
 * Shared pairing flow for the BLE (S2) and QR (S3) screens. For BLE we first run the (simulated)
 * peripheral handshake, then ask the backend for a cardless session; QR skips straight to the
 * server pairing. On success it routes into the machine session (S4).
 */
export function usePairEgm(via: 'ble' | 'qr', navigation: WalletNav) {
  const [pairEgm, { isLoading }] = usePairEgmMutation();
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pair(egmId: string): Promise<void> {
    setConnectingId(egmId);
    setError(null);
    try {
      if (via === 'ble') await ble.connect(egmId);
      const session = await pairEgm({ egmId }).unwrap();
      navigation.replace('MachineSession', {
        egmId: session.egm_id,
        sessionId: session.session_id,
        pairedVia: via,
      });
    } catch {
      setError('Could not pair with that machine. Try again.');
    } finally {
      setConnectingId(null);
    }
  }

  return { pair, pairing: isLoading || connectingId !== null, connectingId, error };
}
