import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';

import { useManifest } from '../../../app/manifest/ManifestProvider';
import { Input, PillButton, ThemedText } from '../../../components';
import { useTheme } from '../../../theme/ThemeProvider';
import { usePlayerLoginMutation } from '../authApi';
import { AuthScaffold } from '../AuthScaffold';
import { errorMessage } from '../errors';
import { persistTokens } from '../session';

import type { AuthStackParamList } from '../types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

/**
 * A3 — email + password login, re-skinned to the obsidian luxury system (RS1): atmospheric backdrop,
 * caps kicker + Playfair title, a floating glass action sheet with an indigo primary pill, and caps
 * links for OTP / recovery. Auth logic, OTP/recovery routes, and H7 device-registration ordering are
 * unchanged.
 */
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
      // H7: device registration now happens AFTER the push pre-permission flow
      // (PushPermissionScreen) — never unconditionally at login.
    } catch {
      // error surfaced from the mutation state below
    }
  };

  return (
    <AuthScaffold kicker={manifest?.name ?? 'Executive Companion'} title="Welcome">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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

        <PillButton
          label="Identify to enter"
          variant="accent"
          block
          onPress={onSubmit}
          disabled={!email || !password || isLoading}
          testID="login-submit"
        />

        <View style={styles.links}>
          <Pressable onPress={() => navigation.navigate('Enrol')} hitSlop={8}>
            <ThemedText variant="label" style={{ color: theme.colors.brand.accent }}>
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
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 16 },
  links: { marginTop: 24, flexDirection: 'row', justifyContent: 'space-between' },
});
