/**
 * Card display helpers for the mock payment-methods screen (S10). No real validation/tokenization —
 * the PaymentPort handles that for real integrations; this only derives a brand + last four for the
 * demo card list.
 */
export function detectCardBrand(digits: string): string {
  const n = digits.replace(/\D/g, '');
  if (/^4/.test(n)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(n)) return 'Mastercard';
  if (/^3[47]/.test(n)) return 'Amex';
  if (/^6(011|5)/.test(n)) return 'Discover';
  return 'Card';
}

export function last4(digits: string): string {
  return digits.replace(/\D/g, '').slice(-4);
}

/** A tolerable-for-mock check: 15–16 digits after stripping spaces. */
export function isPlausibleCard(digits: string): boolean {
  const n = digits.replace(/\D/g, '');
  return n.length >= 15 && n.length <= 16;
}
