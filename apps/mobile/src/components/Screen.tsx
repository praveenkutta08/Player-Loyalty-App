import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../theme/ThemeProvider';

import type { StyleProp, ViewStyle } from 'react-native';

export interface ScreenProps {
  children: React.ReactNode;
  /** Background token under `color.bg.*`. Defaults to "base". */
  background?: string;
  /** Apply horizontal padding from the theme spacing scale. Defaults to true. */
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Edges the SafeAreaView should inset. Defaults to top + bottom. */
  edges?: ReadonlyArray<'top' | 'right' | 'bottom' | 'left'>;
}

/** Themed screen container: safe-area aware, token-driven background + padding. */
export function Screen({
  children,
  background = 'base',
  padded = true,
  style,
  edges = ['top', 'bottom'],
}: ScreenProps): React.JSX.Element {
  const theme = useTheme();
  return (
    <SafeAreaView
      edges={edges}
      style={[
        styles.fill,
        { backgroundColor: theme.colors.bg[background] ?? theme.colors.bg.base },
      ]}
    >
      <View style={[styles.fill, padded && { paddingHorizontal: theme.spacing.lg }, style]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
