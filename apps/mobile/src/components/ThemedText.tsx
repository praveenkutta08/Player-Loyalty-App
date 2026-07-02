import React from 'react';
import { Text } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

import type { ThemeTokens } from '@repo/shared-types';
import type { StyleProp, TextProps, TextStyle } from 'react-native';

type ScaleName = keyof ThemeTokens['typography']['scale'] | string;
type ColorName = keyof ThemeTokens['color']['text'] | string;

export interface ThemedTextProps extends TextProps {
  /** Typography scale step (e.g. "h1", "body", "label"). Defaults to "body". */
  variant?: ScaleName;
  /** Text color token under `color.text.*`. Defaults to "primary". */
  color?: ColorName;
  style?: StyleProp<TextStyle>;
}

/** Text rendered entirely from theme tokens — the base for all copy in the app. */
export function ThemedText({
  variant = 'body',
  color = 'primary',
  style,
  ...rest
}: ThemedTextProps): React.JSX.Element {
  const theme = useTheme();
  const textColor = theme.colors.text[color] ?? theme.colors.text.primary;
  return <Text {...rest} style={[theme.typography(variant), { color: textColor }, style]} />;
}
