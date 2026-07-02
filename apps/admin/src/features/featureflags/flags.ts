// Known platform feature flags. The backend stores feature_flags as a free dict[str,bool] on the
// tenant config; this catalog gives each flag a label, description and rollout badge for the UI.
export interface FlagDef {
  key: string;
  name: string;
  description: string;
  tag: string;
  rollout: number;
}

export const FLAGS: FlagDef[] = [
  {
    key: 'cardless',
    name: 'Cardless Play',
    description: 'Pair phone to slot/table via BLE.',
    tag: 'Gaming',
    rollout: 100,
  },
  {
    key: 'cashless',
    name: 'Cashless Wallet',
    description: 'Fund play and cash out from the wallet.',
    tag: 'Money',
    rollout: 75,
  },
  {
    key: 'digital_key',
    name: 'Digital Room Key',
    description: 'Unlock hotel rooms from the app.',
    tag: 'Hotel',
    rollout: 50,
  },
  {
    key: 'geofencing',
    name: 'Geofencing & Beacons',
    description: 'Location triggers and dwell offers.',
    tag: 'Engagement',
    rollout: 100,
  },
  {
    key: 'biometric_login',
    name: 'Biometric Login',
    description: 'Face ID / fingerprint unlock.',
    tag: 'Security',
    rollout: 60,
  },
  {
    key: 'support_chat',
    name: 'Support Assistant',
    description: 'In-app AI support assistant.',
    tag: 'Support',
    rollout: 40,
  },
];
