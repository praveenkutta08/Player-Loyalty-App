import React from 'react';

import { ComingSoon } from '../../components/ComingSoon';

/** Center Scan/Play action (S1). Cardless BLE + QR + wallet land in P4.6; falls back to Wallet when
 * the `cashless` flag is off (wired in P4.14). */
export function PlayScreen(): React.JSX.Element {
  return <ComingSoon title="Scan / Play" subtitle="Cardless pairing & wallet land in P4.6." />;
}
