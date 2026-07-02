// Curated typography pairings (P7.2) — mirrors the backend catalog (appearance.py). Bundled,
// open-license fonts only: NO free-form family input and NO uploads (fonts ship in the app
// binary; arbitrary tenant fonts would need a build + store release, roadmap §3.21).
export interface PairingDef {
  key: string;
  label: string;
  display: string;
  sans: string;
  hint: string;
}

export const TYPOGRAPHY_PAIRINGS: PairingDef[] = [
  {
    key: 'bodoniManrope',
    label: 'Classic Luxe',
    display: 'Bodoni Moda',
    sans: 'Manrope',
    hint: 'The platform default — high-contrast serif + humanist sans.',
  },
  {
    key: 'marcellusManrope',
    label: 'Resort Serif',
    display: 'Marcellus',
    sans: 'Manrope',
    hint: 'The splash handoff pairing — engraved calm.',
  },
  {
    key: 'playfairInter',
    label: 'Modern Luxury',
    display: 'Playfair Display',
    sans: 'Inter',
    hint: 'Sharper display, neutral UI.',
  },
  {
    key: 'cormorantWorkSans',
    label: 'Editorial',
    display: 'Cormorant',
    sans: 'Work Sans',
    hint: 'Light serif, magazine feel.',
  },
];

export const DEFAULT_PAIRING = 'bodoniManrope';

export function pairingByKey(key: string): PairingDef {
  return TYPOGRAPHY_PAIRINGS.find((p) => p.key === key) ?? TYPOGRAPHY_PAIRINGS[0]!;
}

/** Map a legacy free-font theme (pre-retrofit fontFamily values) onto the nearest pairing. */
export function nearestPairing(display?: string, sans?: string): string {
  const exact = TYPOGRAPHY_PAIRINGS.find((p) => p.display === display && p.sans === sans);
  if (exact) return exact.key;
  const byDisplay = TYPOGRAPHY_PAIRINGS.find((p) => p.display === display);
  if (byDisplay) return byDisplay.key;
  const bySans = TYPOGRAPHY_PAIRINGS.find((p) => p.sans === sans);
  return bySans?.key ?? DEFAULT_PAIRING;
}
