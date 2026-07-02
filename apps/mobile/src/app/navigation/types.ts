import type { AccountStackParamList } from '../../features/account/types';
import type { OffersStackParamList } from '../../features/offers/types';
import type { NavigatorScreenParams } from '@react-navigation/native';

/** Bottom-tab routes (Option B: Home · Offers · Scan/Play · Account · More). */
export type MainTabParamList = {
  Home: undefined;
  Offers: NavigatorScreenParams<OffersStackParamList>;
  Play: undefined;
  Account: NavigatorScreenParams<AccountStackParamList>;
  More: undefined;
};

/** Root stack: main tabs, notification center/detail (reachable from any tab's bell), plus the
 * force-update gate (the splash is owned by the manifest gate). */
export type RootStackParamList = {
  ForceUpdate: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
  Notifications: undefined;
  MessageDetail: { id: string };
};
