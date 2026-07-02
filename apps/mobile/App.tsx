/**
 * White-label player app composition root. Wires the provider stack:
 *   Redux (shared baseApi) → SafeArea → Theme (manifest tokens) → Features (manifest flags) → nav.
 *
 * The app ships NO brand values (GOLDEN RULE #5): ThemeProvider/FeatureProvider currently use the
 * white-label defaults; P4.2 feeds them the resolved tenant manifest fetched on launch.
 *
 * @format
 */
import React from 'react';
import { StatusBar } from 'react-native';
import { Provider as ReduxProvider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { FeatureProvider } from './src/app/providers/FeatureProvider';
import { RootNavigator } from './src/app/navigation/RootNavigator';
import { store } from './src/app/store';
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

function App(): React.JSX.Element {
  return (
    <ReduxProvider store={store}>
      <SafeAreaProvider>
        <ThemeProvider>
          <FeatureProvider>
            <ThemedStatusBar />
            <RootNavigator />
          </FeatureProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ReduxProvider>
  );
}

export default App;
