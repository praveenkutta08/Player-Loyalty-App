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
import React from 'react';
import { StatusBar } from 'react-native';
import { Provider as ReduxProvider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import './src/app/apiConfig'; // side effect: set the initial API base URL before any request
import { ManifestProvider, useManifest } from './src/app/manifest/ManifestProvider';
import { FeatureProvider } from './src/app/providers/FeatureProvider';
import { RootNavigator } from './src/app/navigation/RootNavigator';
import { store } from './src/app/store';
import { buildConfig } from './src/config/buildConfig';
import { BrandSplash } from './src/features/splash/BrandSplash';
import { OfflineBanner } from './src/components/OfflineBanner';
import { DEFAULT_THEME } from './src/theme/tokens';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';

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
    <ThemeProvider tokens={tokens}>
      <FeatureProvider flags={flags}>
        <ThemedStatusBar />
        {status === 'loading' && !manifest ? (
          <BrandSplash title={title} />
        ) : (
          <>
            {status === 'offline' ? <OfflineBanner /> : null}
            <RootNavigator />
          </>
        )}
      </FeatureProvider>
    </ThemeProvider>
  );
}

function App(): React.JSX.Element {
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
