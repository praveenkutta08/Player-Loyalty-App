import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';

import { buildConfig } from '../../config/buildConfig';
import { AuthNavigator } from '../../features/auth/AuthNavigator';
import { BiometricEnrollScreen } from '../../features/auth/screens/BiometricEnrollScreen';
import { LockScreen } from '../../features/auth/screens/LockScreen';
import { registerDevice } from '../../features/auth/session';
import { AskAIScreen } from '../../features/concierge/AskAIScreen';
import { prefetchConciergeBrief } from '../../features/concierge/prefetch';
import { GeoBootstrap } from '../../features/geofencing/GeoBootstrap';
import { ServerConsentSync } from '../../features/geofencing/ServerConsentSync';
import { MessageDetailScreen } from '../../features/notifications/MessageDetailScreen';
import { NotificationCenterScreen } from '../../features/notifications/NotificationCenterScreen';
import { registerPushHandlers } from '../../features/notifications/pushBridge';
import { PushPermissionScreen } from '../../features/notifications/PushPermissionScreen';
import { useDeepLinks } from '../../features/notifications/useDeepLinks';
import { BrandSplash } from '../../features/splash/BrandSplash';
import { ForceUpdateScreen } from '../../features/splash/ForceUpdateScreen';
import { needsForceUpdate } from '../../lib/version';
import { useTheme } from '../../theme/ThemeProvider';
import { useManifest } from '../manifest/ManifestProvider';
import { useFeature } from '../providers/FeatureProvider';
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
  const prefs = useAppSelector((s) => s.notificationPrefs);
  const dispatch = useAppDispatch();
  const conciergeOn = useFeature('concierge');
  const forceUpdate = needsForceUpdate(buildConfig.appVersion, manifest?.minAppVersion);

  // Bridge native push handlers into the inbox store + deep-link routing (once authenticated).
  useEffect(() => {
    if (status !== 'authenticated') return undefined;
    return registerPushHandlers(dispatch, () => new Date().toISOString());
  }, [status, dispatch]);

  // OS casino:// deep links route through the same resolver as push (LOW).
  useDeepLinks(status === 'authenticated');

  // H7: the device token is registered only after the player granted the push prompt; when
  // they already have, re-register on each session so token rotation reaches the server.
  useEffect(() => {
    if (status !== 'authenticated' || !prefs.hydrated || prefs.pushPrompt !== 'enabled') return;
    void registerDevice();
  }, [status, prefs.hydrated, prefs.pushPrompt]);

  // Prefetch the concierge brief as soon as we're authenticated (still behind the biometric
  // gates) so Home renders the hero straight from cache — no spinner on Home (P6.6).
  useEffect(() => {
    if (status !== 'authenticated') return;
    prefetchConciergeBrief(dispatch, conciergeOn);
  }, [status, dispatch, conciergeOn]);

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
    fonts: navFontsFromTheme(theme.fontFamily.sans),
  };

  if (status === 'restoring') {
    return <BrandSplash title={manifest?.name ?? buildConfig.appName} />;
  }

  // G8/M16 — force-update gate: below the manifest's floor nothing else renders. Checked
  // before auth so an outdated build can't even reach the login flow.
  if (forceUpdate) {
    return <ForceUpdateScreen />;
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

  // H7 — push pre-permission: asked once, after the biometric gates, before the app renders.
  if (status === 'authenticated' && prefs.hydrated && prefs.pushPrompt === 'unasked') {
    return <PushPermissionScreen />;
  }

  return (
    <>
      {status === 'authenticated' ? <GeoBootstrap /> : null}
      {status === 'authenticated' ? <ServerConsentSync /> : null}
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
            <Stack.Screen
              name="AskAI"
              component={AskAIScreen}
              options={{ ...detailHeader(theme), title: 'Ask AI' }}
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

/**
 * React Navigation 7 requires a `fonts` block on its theme. Derived from the RESOLVED theme's
 * sans family (manifest typography tokens), never a hardcoded brand font (H6/M18).
 */
function navFontsFromTheme(sans: string): NavTheme['fonts'] {
  return {
    regular: { fontFamily: sans, fontWeight: '400' },
    medium: { fontFamily: sans, fontWeight: '500' },
    bold: { fontFamily: sans, fontWeight: '700' },
    heavy: { fontFamily: sans, fontWeight: '800' },
  };
}
