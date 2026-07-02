import { useState } from 'react';
import uuid from 'react-native-uuid';

import type { MoveState } from './money';

/** Pull a human message out of an RTK Query error (problem+json title/detail), else a fallback. */
function moveErrorMessage(err: unknown): string {
  const data = (err as { data?: { title?: string; detail?: string } } | undefined)?.data;
  return data?.detail ?? data?.title ?? 'Something went wrong. Please try again.';
}

/**
 * Drives one money move with clear pending/success/failure states. The Idempotency-Key is minted
 * once per attempt and reused across retries (GOLDEN RULE #4) so a retry of a timed-out request can
 * never double-move funds; `reset` mints a fresh key for the next distinct move.
 */
export function useMoneyMove(perform: (amountCents: number, idempotencyKey: string) => Promise<unknown>) {
  const [key, setKey] = useState<string>(() => String(uuid.v4()));
  const [state, setState] = useState<MoveState>('idle');
  const [error, setError] = useState<string | null>(null);

  async function submit(amountCents: number): Promise<void> {
    setState('pending');
    setError(null);
    try {
      await perform(amountCents, key);
      setState('success');
    } catch (err) {
      setState('failure');
      setError(moveErrorMessage(err));
    }
  }

  function reset(): void {
    setKey(String(uuid.v4()));
    setState('idle');
    setError(null);
  }

  return { key, state, error, submit, reset };
}
