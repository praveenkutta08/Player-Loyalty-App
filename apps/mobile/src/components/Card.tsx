import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

import type { StyleProp, ViewStyle } from 'react-native';

export interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Background token under `color.bg.*`. Defaults to "surface". */
  background?: string;
  testID?: string;
}

/** Surface card (`components.card`): themed background, hairline border, rounded corners. */
export function Card({
  children,
  style,
  background = 'surface',
  testID,
}: CardProps): React.JSX.Element {
  const theme = useTheme();
  return (
    <View
      testID={testID}
      style={[
        {
          backgroundColor: theme.colors.bg[background] ?? theme.colors.bg.surface,
          borderColor: theme.colors.border.default,
          borderWidth: StyleSheet.hairlineWidth,
          borderRadius: theme.radius.card,
          padding: theme.spacing.md,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
