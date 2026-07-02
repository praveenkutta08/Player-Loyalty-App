import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ForceUpdateScreen } from '../../features/splash/ForceUpdateScreen';
import { useTheme } from '../../theme/ThemeProvider';
import { MainTabs } from './MainTabs';

import type { RootStackParamList } from './types';
import type { Theme as NavTheme } from '@react-navigation/native';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Root navigation: the main tabs, plus a Force-Update gate. The brand splash is owned by the
 * manifest gate (App), which renders it until the manifest resolves — so the stack starts at Main.
 * Header handled per-tab (TopBar).
 */
export function RootNavigator(): React.JSX.Element {
  const theme = useTheme();

  // Feed React Navigation's container theme from our tokens so native transitions match the brand.
  const navTheme: NavTheme = {
    dark: theme.scheme === 'dark',
    colors: {
      primary: theme.colors.brand.gold,
      background: theme.colors.bg.base,
      card: theme.colors.bg.base,
      text: theme.colors.text.primary,
      border: theme.colors.border.soft,
      notification: theme.colors.state.error,
    },
    fonts: DEFAULT_NAV_FONTS,
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator initialRouteName="Main" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="ForceUpdate" component={ForceUpdateScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

/** React Navigation 7 requires a `fonts` block on its theme; map to our UI font family. */
const DEFAULT_NAV_FONTS: NavTheme['fonts'] = {
  regular: { fontFamily: 'Manrope', fontWeight: '400' },
  medium: { fontFamily: 'Manrope', fontWeight: '500' },
  bold: { fontFamily: 'Manrope', fontWeight: '700' },
  heavy: { fontFamily: 'Manrope', fontWeight: '800' },
};
