import type { NavigatorScreenParams } from '@react-navigation/native';

/** Bottom-tab routes (Option B: Home · Offers · Scan/Play · Account · More). */
export type MainTabParamList = {
  Home: undefined;
  Offers: undefined;
  Play: undefined;
  Account: undefined;
  More: undefined;
};

/** Root stack: splash → main tabs, plus the force-update gate. */
export type RootStackParamList = {
  Splash: undefined;
  ForceUpdate: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
};
