import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Button, Input, Screen, ThemedText } from '../../../components';
import { useManifest } from '../../../app/manifest/ManifestProvider';
import { useTheme } from '../../../theme/ThemeProvider';
import { usePlayerLoginMutation } from '../authApi';
import { errorMessage } from '../errors';
import { persistTokens, registerDevice } from '../session';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

/** A3 — email + password login. Passwordless (OTP) enrolment and recovery are one tap away. */
export function LoginScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme();
  const { manifest } = useManifest();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [login, { isLoading, error }] = usePlayerLoginMutation();

  const onSubmit = async (): Promise<void> => {
    try {
      const tokens = await login({ email: email.trim(), password }).unwrap();
      await persistTokens(tokens);
      void registerDevice();
    } catch {
      // error surfaced from the mutation state below
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.fill}
      >
        <View style={styles.header}>
          <ThemedText variant="display" style={{ color: theme.colors.brand.gold }}>
            {manifest?.name ?? 'Welcome'}
          </ThemedText>
          <ThemedText variant="body" color="muted" style={{ marginTop: theme.spacing.xs }}>
            Sign in to continue
          </ThemedText>
        </View>

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
        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          containerStyle={styles.field}
        />

        {error ? (
          <ThemedText variant="label" style={{ color: theme.colors.state.error, marginBottom: 12 }}>
            {errorMessage(error, 'Sign in failed. Check your details and try again.')}
          </ThemedText>
        ) : null}

        <Button
          label="Sign in"
          onPress={onSubmit}
          loading={isLoading}
          disabled={!email || !password}
          testID="login-submit"
        />

        <View style={styles.links}>
          <Pressable onPress={() => navigation.navigate('Enrol')} hitSlop={8}>
            <ThemedText variant="label" style={{ color: theme.colors.brand.gold }}>
              Use a one-time code
            </ThemedText>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('Forgot')} hitSlop={8}>
            <ThemedText variant="label" color="muted">
              Forgot password?
            </ThemedText>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: 'center' },
  header: { marginBottom: 32 },
  field: { marginBottom: 16 },
  links: { marginTop: 24, flexDirection: 'row', justifyContent: 'space-between' },
});
