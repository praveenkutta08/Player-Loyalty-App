/**
 * Money + transaction display helpers for the Wallet feature. Amounts are signed minor units
 * (cents) exactly as the ledger stores them (GOLDEN RULE #4): credits positive, debits negative.
 */
import type { StatusTone } from '../../components';

/** `$12.34` / `-$5.00` from signed cents. */
export function formatMoney(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

/**
 * Parse a user-typed dollar amount into positive whole cents. Returns null for anything that is not
 * a positive money value (empty, non-numeric, zero/negative, or more than 2 decimal places).
 */
export function parseAmountCents(input: string): number | null {
  const trimmed = input.trim().replace(/^\$/, '');
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const cents = Math.round(parseFloat(trimmed) * 100);
  return cents > 0 ? cents : null;
}

/** Human label for a ledger entry type. */
export function txnLabel(type: string): string {
  switch (type) {
    case 'fund':
      return 'Deposit';
    case 'transfer_to_egm':
      return 'Transfer to machine';
    case 'cashout':
      return 'Cash-out';
    case 'refund':
      return 'Refund';
    default:
      return type;
  }
}

/** Short, locale-friendly date for a ledger timestamp (ISO string). */
export function formatTxnDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Money-movement UI state: in-flight, settled, or rejected. */
export type MoveState = 'idle' | 'pending' | 'success' | 'failure';

/** Status-pill tone for a ledger entry status (completed | failed) or a live move state. */
export function txnTone(status: string): StatusTone {
  switch (status) {
    case 'completed':
    case 'success':
      return 'success';
    case 'failed':
    case 'failure':
      return 'error';
    case 'pending':
      return 'warning';
    default:
      return 'muted';
  }
}
