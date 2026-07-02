// Demo member records. There is no admin player-list endpoint in the P1–P2 backend (player data
// is player-scoped: /players/me, wallet, etc.), so the CRM runs on local demo data and is
// documented as pending an admin players API. PII masking + gated unmask/export are enforced here.
export interface Member {
  id: string;
  name: string;
  email: string;
  dob: string;
  govId: string;
  tier: string;
  status: 'active' | 'suspended' | 'self_excluded';
  kyc: 'verified' | 'pending' | 'rejected';
  points: number;
  walletCents: number;
  segment: string;
  locationConsent: boolean;
}

export const MEMBERS: Member[] = [
  {
    id: 'p-alice',
    name: 'Alice Nguyen',
    email: 'alice@demo-casino.com',
    dob: '1988-04-12',
    govId: 'A1234567',
    tier: 'Gold',
    status: 'active',
    kyc: 'verified',
    points: 24810,
    walletCents: 145000,
    segment: 'vip',
    locationConsent: true,
  },
  {
    id: 'p-bob',
    name: 'Bob Carter',
    email: 'bob@demo-casino.com',
    dob: '1975-11-30',
    govId: 'B7654321',
    tier: 'Silver',
    status: 'active',
    kyc: 'verified',
    points: 8120,
    walletCents: 32000,
    segment: 'gold',
    locationConsent: false,
  },
  {
    id: 'p-carol',
    name: 'Carol Diaz',
    email: 'carol@demo-casino.com',
    dob: '1992-07-08',
    govId: 'C2468013',
    tier: 'Bronze',
    status: 'suspended',
    kyc: 'pending',
    points: 1450,
    walletCents: 0,
    segment: 'new',
    locationConsent: true,
  },
  {
    id: 'p-dan',
    name: 'Dan Lewis',
    email: 'dan@demo-casino.com',
    dob: '1969-01-22',
    govId: 'D1357924',
    tier: 'Diamond',
    status: 'self_excluded',
    kyc: 'verified',
    points: 152300,
    walletCents: 980000,
    segment: 'vip',
    locationConsent: false,
  },
];

/** Mask all but the last N characters (default 2). */
export function mask(value: string, visible = 2): string {
  if (value.length <= visible) return '••';
  return '•'.repeat(Math.max(4, value.length - visible)) + value.slice(-visible);
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain) return mask(email);
  return `${user!.slice(0, 1)}•••@${domain}`;
}
