import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Button, Input, Screen, ThemedText } from '../../../components';
import { useTheme } from '../../../theme/ThemeProvider';
import { useRequestOtpMutation, useVerifyOtpMutation } from '../authApi';
import { errorMessage } from '../errors';
import { persistTokens, registerDevice } from '../session';

import type { AuthStackParamList } from '../types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<AuthStackParamList, 'Otp'>;

/** A4 — one-time code verification. On success the token pair is persisted and the app unlocks. */
export function OtpScreen({ route }: Props): React.JSX.Element {
  const theme = useTheme();
  const { email } = route.params;
  const [code, setCode] = useState('');
  const [verifyOtp, { isLoading, error }] = useVerifyOtpMutation();
  const [requestOtp, { isLoading: resending }] = useRequestOtpMutation();

  const onVerify = async (): Promise<void> => {
    try {
      const tokens = await verifyOtp({ email, code: code.trim() }).unwrap();
      await persistTokens(tokens);
      void registerDevice();
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
        <ThemedText variant="h1">Enter your code</ThemedText>
        <ThemedText variant="body" color="muted" style={styles.subtitle}>
          We sent a one-time code to {email}.
        </ThemedText>

        <Input
          label="6-digit code"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          placeholder="123456"
          containerStyle={styles.field}
        />

        {error ? (
          <ThemedText variant="label" style={{ color: theme.colors.state.error, marginBottom: 12 }}>
            {errorMessage(error, 'Invalid or expired code.')}
          </ThemedText>
        ) : null}

        <Button
          label="Verify"
          onPress={onVerify}
          loading={isLoading}
          disabled={!code}
          testID="otp-submit"
        />

        <View style={styles.links}>
          <Pressable onPress={() => void requestOtp({ email })} hitSlop={8} disabled={resending}>
            <ThemedText variant="label" style={{ color: theme.colors.brand.gold }}>
              {resending ? 'Sending…' : 'Resend code'}
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
