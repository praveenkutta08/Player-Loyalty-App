import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Button, Input, Screen, ThemedText } from '../../../components';
import { useTheme } from '../../../theme/ThemeProvider';
import { useRequestOtpMutation } from '../authApi';
import { errorMessage } from '../errors';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Forgot'>;

/**
 * A8 — account recovery. There is no password-reset endpoint in the MVP, so recovery is passwordless:
 * we send a one-time code to the email and sign the player in via OTP (they can reset later).
 */
export function ForgotPasswordScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [requestOtp, { isLoading, error }] = useRequestOtpMutation();

  const onSubmit = async (): Promise<void> => {
    try {
      await requestOtp({ email: email.trim() }).unwrap();
      navigation.navigate('Otp', { email: email.trim(), mode: 'recover' });
    } catch {
      // surfaced below
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.fill}
      >
        <ThemedText variant="h1">Recover access</ThemedText>
        <ThemedText variant="body" color="muted" style={styles.subtitle}>
          Enter your email and we'll send a one-time code so you can get back in.
        </ThemedText>

        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          placeholder="you@example.com"
          containerStyle={styles.field}
        />

        {error ? (
          <ThemedText variant="label" style={{ color: theme.colors.state.error, marginBottom: 12 }}>
            {errorMessage(error, "Couldn't send a code. Try again.")}
          </ThemedText>
        ) : null}

        <Button
          label="Send code"
          onPress={onSubmit}
          loading={isLoading}
          disabled={!email}
          testID="forgot-submit"
        />

        <View style={styles.links}>
          <Pressable onPress={() => navigation.navigate('Login')} hitSlop={8}>
            <ThemedText variant="label" color="muted">
              Back to sign in
            </ThemedText>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: 'center' },
  subtitle: { marginTop: 8, marginBottom: 32 },
  field: { marginBottom: 16 },
  links: { marginTop: 24, alignItems: 'center' },
});
