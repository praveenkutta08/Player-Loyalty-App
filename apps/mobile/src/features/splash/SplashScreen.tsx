import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '../../components';
import { buildConfig } from '../../config/buildConfig';
import { useTheme } from '../../theme/ThemeProvider';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../app/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

/**
 * A1 — brand load screen. In P4.1 it briefly shows the brand lockup then enters the app. P4.2 turns
 * this into the real manifest-resolution + version-check gate (theme hydrated before first paint).
 */
export function SplashScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme();

  useEffect(() => {
    const t = setTimeout(() => navigation.replace('Main', { screen: 'Home' }), 600);
    return () => clearTimeout(t);
  }, [navigation]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg.base }]}>
      <ThemedText variant="display" style={{ color: theme.colors.brand.gold }}>
        {buildConfig.appName}
      </ThemedText>
      <ActivityIndicator
        color={theme.colors.brand.gold}
        style={{ marginTop: theme.spacing.xl }}
        accessibilityLabel="Loading"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
