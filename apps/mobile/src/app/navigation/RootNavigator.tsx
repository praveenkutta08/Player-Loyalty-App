import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';

import { buildConfig } from '../../config/buildConfig';
import { AuthNavigator } from '../../features/auth/AuthNavigator';
import { BiometricEnrollScreen } from '../../features/auth/screens/BiometricEnrollScreen';
import { LockScreen } from '../../features/auth/screens/LockScreen';
import { GeoBootstrap } from '../../features/geofencing/GeoBootstrap';
import { MessageDetailScreen } from '../../features/notifications/MessageDetailScreen';
import { NotificationCenterScreen } from '../../features/notifications/NotificationCenterScreen';
import { registerPushHandlers } from '../../features/notifications/pushBridge';
import { BrandSplash } from '../../features/splash/BrandSplash';
import { ForceUpdateScreen } from '../../features/splash/ForceUpdateScreen';
import { useTheme } from '../../theme/ThemeProvider';
import { useManifest } from '../manifest/ManifestProvider';
import { useAppDispatch, useAppSelector } from '../store';

import { MainTabs } from './MainTabs';
import { navigationRef } from './navigationRef';

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
  const biometric = useAppSelector((s) => s.biometric);
  const dispatch = useAppDispatch();

  // Bridge native push handlers into the inbox store + deep-link routing (once authenticated).
  useEffect(() => {
    if (status !== 'authenticated') return undefined;
    return registerPushHandlers(dispatch, () => new Date().toISOString());
  }, [status, dispatch]);

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

  // Biometric gates (only once authenticated): lock a restored session, or offer enrollment after
  // the first login. Both stand in front of the app entirely.
  if (status === 'authenticated' && biometric.enabled && biometric.locked) {
    return <LockScreen />;
  }
  if (
    status === 'authenticated' &&
    biometric.available &&
    !biometric.enabled &&
    !biometric.enrollDismissed
  ) {
    return <BiometricEnrollScreen />;
  }

  return (
    <>
      {status === 'authenticated' ? <GeoBootstrap /> : null}
      <NavigationContainer ref={navigationRef} theme={navTheme}>
        {status === 'authenticated' ? (
        <Stack.Navigator initialRouteName="Main" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="ForceUpdate" component={ForceUpdateScreen} />
          <Stack.Screen
            name="Notifications"
            component={NotificationCenterScreen}
            options={{ ...detailHeader(theme), title: 'Notifications' }}
          />
          <Stack.Screen
            name="MessageDetail"
            component={MessageDetailScreen}
            options={{ ...detailHeader(theme), title: 'Message' }}
          />
        </Stack.Navigator>
        ) : (
          <AuthNavigator />
        )}
      </NavigationContainer>
    </>
  );
}

/** Themed native-stack header for the root-level detail screens (notification center + message). */
function detailHeader(theme: ReturnType<typeof useTheme>) {
  return {
    headerShown: true,
    headerStyle: { backgroundColor: theme.colors.bg.base },
    headerTintColor: theme.colors.text.primary,
    headerTitleStyle: { fontFamily: theme.fontFamily.sans },
    headerShadowVisible: false,
    contentStyle: { backgroundColor: theme.colors.bg.base },
  } as const;
}

/** React Navigation 7 requires a `fonts` block on its theme; map to our UI font family. */
const DEFAULT_NAV_FONTS: NavTheme['fonts'] = {
  regular: { fontFamily: 'Manrope', fontWeight: '400' },
  medium: { fontFamily: 'Manrope', fontWeight: '500' },
  bold: { fontFamily: 'Manrope', fontWeight: '700' },
  heavy: { fontFamily: 'Manrope', fontWeight: '800' },
};
