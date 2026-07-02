import { useState } from 'react';

import { digitalKey } from '../../native/digitalKey';

import { useUnlockKeyMutation } from './digitalKeyApi';

export type UnlockState = 'idle' | 'unlocking' | 'unlocked' | 'denied' | 'error';

/**
 * Two-step unlock: the on-device SDK stub performs the local radio handshake (native/digitalKey),
 * then the backend authorizes + audits the unlock via DigitalKeyPort. Any failure on either leg
 * surfaces as a clear state. `door_id` defaults to the room door.
 */
export function useUnlockKey() {
  const [unlockOnServer] = useUnlockKeyMutation();
  const [state, setState] = useState<UnlockState>('idle');

  async function unlock(keyId: string, doorId: string): Promise<void> {
    setState('unlocking');
    try {
      const local = await digitalKey.unlock(keyId);
      if (local.status !== 'unlocked') {
        setState(local.status); // 'denied' | 'error'
        return;
      }
      const result = await unlockOnServer({ keyId, door_id: doorId }).unwrap();
      setState(result.unlocked ? 'unlocked' : 'denied');
    } catch {
      setState('error');
    }
  }

  function reset(): void {
    setState('idle');
  }

  return { state, unlock, reset };
}
