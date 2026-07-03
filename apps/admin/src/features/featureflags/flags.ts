// Known platform feature flags. The backend stores feature_flags as a free dict[str,bool] on the
// tenant config; this catalog gives each flag a label + description for the UI. There is NO
// rollout percentage — flags are simple on/off (M12).
export interface FlagDef {
  key: string;
  name: string;
  description: string;
  tag: string;
}

export const FLAGS: FlagDef[] = [
  {
    key: 'cardless',
    name: 'Cardless Play',
    description: 'Pair phone to slot/table via BLE.',
    tag: 'Gaming',
  },
  {
    key: 'cashless',
    name: 'Cashless Wallet',
    description: 'Fund play and cash out from the wallet.',
    tag: 'Money',
  },
  {
    key: 'digital_key',
    name: 'Digital Room Key',
    description: 'Unlock hotel rooms from the app.',
    tag: 'Hotel',
  },
  {
    key: 'geofencing',
    name: 'Geofencing & Beacons',
    description: 'Location triggers and dwell offers.',
    tag: 'Engagement',
  },
  {
    key: 'biometric_login',
    name: 'Biometric Login',
    description: 'Face ID / fingerprint unlock.',
    tag: 'Security',
  },
  {
    key: 'support_chat',
    name: 'Support Assistant',
    description: 'In-app AI support assistant.',
    tag: 'Support',
  },
  {
    key: 'concierge',
    name: 'AI Concierge',
    description: 'Visit-fit brief, ranked For You offers, and Ask AI.',
    tag: 'Engagement',
  },
];
