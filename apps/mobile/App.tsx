/**
 * White-label player app composition root. Wires the provider stack:
 *   Redux (shared baseApi) → SafeArea → Manifest (resolve tenant) → Theme + Features → nav.
 *
 * The app ships NO brand values (GOLDEN RULE #5): the ManifestProvider resolves the tenant manifest
 * on launch and feeds its (default-merged) theme tokens into ThemeProvider and its feature flags
 * into FeatureProvider. Until the manifest resolves (and no cache exists) the brand splash shows.
 *
 * @format
 */
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as ReduxProvider } from 'react-redux';

import './src/app/apiConfig'; // side effect: set the initial API base URL before any request
import './src/features/auth/session'; // side effect: wire configureApiAuth (token/refresh)
import { ManifestProvider, useManifest } from './src/app/manifest/ManifestProvider';
import { RootNavigator } from './src/app/navigation/RootNavigator';
import { FeatureProvider } from './src/app/providers/FeatureProvider';
import { store } from './src/app/store';
import { OfflineBanner } from './src/components/OfflineBanner';
import { buildConfig } from './src/config/buildConfig';
import { AuthProvider } from './src/features/auth/AuthProvider';
import {
  hydrateNotificationPrefs,
  persistNotificationPrefs,
} from './src/features/notifications/prefsPersistence';
import { BrandSplash } from './src/features/splash/BrandSplash';
import { Splash } from './src/features/splash/Splash';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';
import { DEFAULT_THEME } from './src/theme/tokens';

function ThemedStatusBar(): React.JSX.Element {
  const theme = useTheme();
  return (
    <StatusBar
      barStyle={theme.scheme === 'dark' ? 'light-content' : 'dark-content'}
      backgroundColor={theme.colors.bg.base}
    />
  );
}

/**
 * Reads the resolved manifest and themes the app from it. Renders the brand splash while the
 * manifest is still resolving with no cached copy; shows the offline banner when serving a cache.
 */
function ThemedRoot(): React.JSX.Element {
  const { manifest, status } = useManifest();
  const tokens = manifest?.theme ?? DEFAULT_THEME;
  const flags = manifest?.featureFlags ?? {};
  const title = manifest?.name ?? buildConfig.appName;

  return (
    <ThemeProvider tokens={tokens} forcedScheme={manifest?.themeMode}>
      <FeatureProvider flags={flags}>
        <ThemedStatusBar />
        {status === 'loading' && !manifest ? (
          <BrandSplash title={title} />
        ) : (
          <AuthProvider>
            {status === 'offline' ? <OfflineBanner /> : null}
            <RootNavigator />
          </AuthProvider>
        )}
        <AnimatedSplashGate />
      </FeatureProvider>
    </ThemeProvider>
  );
}

// Plays ONCE per cold start (module flag survives re-renders/hot navigation, resets with the
// process — the handoff's "no loops, no replay" rule).
let splashPlayedThisLaunch = false;

/**
 * P7.3 — the manifest-driven animated splash, overlaid above the whole app on cold start. It
 * never blocks on network: config comes from the cached manifest (or bundled silk defaults),
 * and manifest/session/Home prefetch continue underneath while the timeline plays.
 */
function AnimatedSplashGate(): React.JSX.Element | null {
  const { manifest } = useManifest();
  const [visible, setVisible] = useState(!splashPlayedThisLaunch);
  if (!visible) return null;
  return (
    <Splash
      splash={manifest?.splash}
      brandName={manifest?.name ?? buildConfig.appName}
      onDone={() => {
        splashPlayedThisLaunch = true;
        setVisible(false);
      }}
    />
  );
}

function App(): React.JSX.Element {
  // Notification prefs survive cold starts (H7): hydrate once, then persist every change.
  useEffect(() => {
    void hydrateNotificationPrefs(store);
    return persistNotificationPrefs(store);
  }, []);

  return (
    <ReduxProvider store={store}>
      <SafeAreaProvider>
        <ManifestProvider>
          <ThemedRoot />
        </ManifestProvider>
      </SafeAreaProvider>
    </ReduxProvider>
  );
}

export default App;
