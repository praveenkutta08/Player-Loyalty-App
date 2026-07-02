import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { ThemedText } from './ThemedText';

import type { StyleProp, TextInputProps, ViewStyle } from 'react-native';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  /** Validation/help message shown under the field. */
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

/** Themed text field (`components.input`) with optional label + error, all from tokens. */
export function Input({ label, error, containerStyle, ...rest }: InputProps): React.JSX.Element {
  const theme = useTheme();
  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <ThemedText variant="label" color="muted" style={styles.label}>
          {label}
        </ThemedText>
      ) : null}
      <TextInput
        placeholderTextColor={theme.colors.text.muted}
        {...rest}
        style={[
          theme.typography('body'),
          {
            color: theme.colors.text.primary,
            backgroundColor: theme.colors.bg.surface,
            borderColor: error ? theme.colors.state.error : theme.colors.border.default,
            borderWidth: StyleSheet.hairlineWidth,
            borderRadius: theme.radius.control,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm + 2,
          },
        ]}
      />
      {error ? (
        <ThemedText variant="label" style={{ color: theme.colors.state.error, marginTop: 4 }}>
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  label: { marginBottom: 6 },
});
