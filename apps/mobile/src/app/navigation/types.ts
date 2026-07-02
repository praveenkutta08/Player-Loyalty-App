import type { NavigatorScreenParams } from '@react-navigation/native';

/** Bottom-tab routes (Option B: Home · Offers · Scan/Play · Account · More). */
export type MainTabParamList = {
  Home: undefined;
  Offers: undefined;
  Play: undefined;
  Account: undefined;
  More: undefined;
};

/** Root stack: main tabs, plus the force-update gate (the splash is owned by the manifest gate). */
export type RootStackParamList = {
  ForceUpdate: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
};
