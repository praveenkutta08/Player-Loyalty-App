import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

import type { StyleProp, ViewStyle } from 'react-native';

export interface HairlineRowProps {
  children: React.ReactNode;
  onPress?: () => void;
  /** Draw the 0.5px inset hairline below this row (omit on the last row). Defaults to true. */
  divider?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Utility list row (DESIGN.md → Utility Lists): content on a 0.5px hairline that stops 24px from
 * each edge — never full-bleed. Optional press affordance for navigable rows.
 */
export function HairlineRow({
  children,
  onPress,
  divider = true,
  style,
  testID,
}: HairlineRowProps): React.JSX.Element {
  const theme = useTheme();
  const Wrapper: React.ElementType = onPress ? Pressable : View;
  return (
    <Wrapper
      testID={testID}
      onPress={onPress}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: theme.spacing.md,
          borderBottomWidth: divider ? StyleSheet.hairlineWidth : 0,
          borderBottomColor: theme.colors.border.ghost ?? theme.colors.border.soft,
          // Hairline inset 24px from each edge: the border is on the inner content box.
          marginHorizontal: theme.spacing.lg,
        },
        style,
      ]}
    >
      {children}
    </Wrapper>
  );
}
