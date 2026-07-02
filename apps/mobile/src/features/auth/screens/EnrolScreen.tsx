import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Button, Input, Screen, ThemedText } from '../../../components';
import { useTheme } from '../../../theme/ThemeProvider';
import { useRequestOtpMutation } from '../authApi';
import { errorMessage } from '../errors';

import type { AuthStackParamList } from '../types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<AuthStackParamList, 'Enrol'>;

/**
 * A5 — enrolment / link loyalty account. Passwordless: enter your email, we send a one-time code
 * (backend logs it in dev), then verify on the OTP screen. Reuses the OTP endpoints.
 */
export function EnrolScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [requestOtp, { isLoading, error }] = useRequestOtpMutation();

  const onSubmit = async (): Promise<void> => {
    try {
      await requestOtp({ email: email.trim() }).unwrap();
      navigation.navigate('Otp', { email: email.trim(), mode: 'enrol' });
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
        <ThemedText variant="h1">Get started</ThemedText>
        <ThemedText variant="body" color="muted" style={styles.subtitle}>
          Enter your email and we'll send a one-time code to link your account.
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
          testID="enrol-submit"
        />

        <View style={styles.links}>
          <Pressable onPress={() => navigation.navigate('Login')} hitSlop={8}>
            <ThemedText variant="label" style={{ color: theme.colors.brand.gold }}>
              Sign in with a password instead
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
