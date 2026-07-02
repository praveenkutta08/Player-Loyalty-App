import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

export interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  testID?: string;
}

/** Themed on/off switch (`components.toggle`): gold track when on, from tokens. */
export function Toggle({
  value,
  onValueChange,
  disabled = false,
  testID,
}: ToggleProps): React.JSX.Element {
  const theme = useTheme();
  const trackColor = value ? theme.colors.brand.gold : theme.colors.border.soft;
  const knobColor = value ? theme.colors.brand.onGold : theme.colors.text.faint;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      style={[styles.track, { backgroundColor: trackColor, opacity: disabled ? 0.5 : 1 }]}
    >
      <View
        style={[
          styles.knob,
          { backgroundColor: knobColor, alignSelf: value ? 'flex-end' : 'flex-start' },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: 44, height: 26, borderRadius: 13, padding: 3, justifyContent: 'center' },
  knob: { width: 20, height: 20, borderRadius: 10 },
});
