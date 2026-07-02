import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { buildConfig } from '../../config/buildConfig';
import { AuthNavigator } from '../../features/auth/AuthNavigator';
import { BrandSplash } from '../../features/splash/BrandSplash';
import { ForceUpdateScreen } from '../../features/splash/ForceUpdateScreen';
import { useManifest } from '../manifest/ManifestProvider';
import { useAppSelector } from '../store';
import { useTheme } from '../../theme/ThemeProvider';
import { MainTabs } from './MainTabs';

import type { RootStackParamList } from './types';
import type { Theme as NavTheme } from '@react-navigation/native';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Root navigation, gated on auth status: `restoring` shows the brand splash; `authenticated` shows
 * the main tabs (+ force-update gate); otherwise the auth stack. The manifest splash is handled a
 * level up (App); this handles the session-restore splash. Header is per-tab (TopBar).
 */
export function RootNavigator(): React.JSX.Element {
  const theme = useTheme();
  const { manifest } = useManifest();
  const status = useAppSelector((s) => s.auth.status);

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

  if (status === 'restoring') {
    return <BrandSplash title={manifest?.name ?? buildConfig.appName} />;
  }

  return (
    <NavigationContainer theme={navTheme}>
      {status === 'authenticated' ? (
        <Stack.Navigator initialRouteName="Main" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="ForceUpdate" component={ForceUpdateScreen} />
        </Stack.Navigator>
      ) : (
        <AuthNavigator />
      )}
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
