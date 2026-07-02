import type { StatusTone } from '../../components';

/**
 * KYC status → UI copy + pill tone. Mirrors the KycPort mock states (P2/P4.5): a player is
 * `unverified` until they start, `pending` while the mock adjudicates, then a terminal
 * `verified` / `referred` / `rejected`. The server is the source of truth; this is display only.
 */
export interface KycView {
  label: string;
  tone: StatusTone;
  /** Whether the "Start verification" action should be offered. */
  canStart: boolean;
  description: string;
}

export function kycView(status?: string): KycView {
  switch ((status ?? 'unverified').toLowerCase()) {
    case 'verified':
    case 'pass':
      return {
        label: 'Verified',
        tone: 'success',
        canStart: false,
        description: 'Your identity is verified. All features are available.',
      };
    case 'pending':
    case 'in_review':
      return {
        label: 'In review',
        tone: 'info',
        canStart: false,
        description: 'We are reviewing your documents. This usually takes a few minutes.',
      };
    case 'referred':
    case 'refer':
      return {
        label: 'Needs review',
        tone: 'warning',
        canStart: true,
        description: 'We need another look at your details. You can restart verification.',
      };
    case 'rejected':
    case 'fail':
      return {
        label: 'Failed',
        tone: 'error',
        canStart: true,
        description: 'Verification could not be completed. Please try again.',
      };
    default:
      return {
        label: 'Not verified',
        tone: 'muted',
        canStart: true,
        description: 'Verify your identity to unlock cashless play and withdrawals.',
      };
  }
}

/** Convenience for pill-only surfaces (e.g. the Account home banner). */
export function kycTone(status?: string): StatusTone {
  return kycView(status).tone;
}
