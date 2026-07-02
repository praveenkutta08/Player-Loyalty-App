import { ScanFace } from 'lucide-react-native';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAppDispatch } from '../../../app/store';
import { Button, Input, Screen, ThemedText } from '../../../components';
import { useTheme } from '../../../theme/ThemeProvider';
import { dismissEnroll, setEnabled } from '../biometricSlice';
import { isValidPasscode, setBiometricEnabled, setPasscode } from '../biometricStore';

/**
 * A2 (enroll) — offered once after the first login when a biometric sensor is available. Enabling
 * requires setting a passcode fallback (needed when biometrics fail/lock out). Everything stays on
 * device; declining just proceeds to the app.
 */
export function BiometricEnrollScreen(): React.JSX.Element {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function enable(): Promise<void> {
    if (!isValidPasscode(pin)) {
      setError('Passcode must be 4–6 digits.');
      return;
    }
    if (pin !== confirm) {
      setError('Passcodes don’t match.');
      return;
    }
    await setPasscode(pin);
    await setBiometricEnabled(true);
    dispatch(setEnabled(true));
    dispatch(dismissEnroll());
  }

  return (
    <Screen>
      <View style={styles.content}>
        <View style={styles.hero}>
          <ScanFace size={56} color={theme.colors.brand.gold} />
          <ThemedText variant="h2" style={styles.title}>
            Faster, secure sign-in
          </ThemedText>
          <ThemedText variant="body" color="muted" style={styles.blurb}>
            Enable Face ID to unlock the app next time. Set a passcode as a backup for when Face ID
            isn’t available.
          </ThemedText>
        </View>

        <Input
          label="Create passcode (4–6 digits)"
          value={pin}
          onChangeText={(t) => {
            setPin(t.replace(/\D/g, '').slice(0, 6));
            setError(null);
          }}
          keyboardType="number-pad"
          secureTextEntry
          containerStyle={styles.input}
        />
        <Input
          label="Confirm passcode"
          value={confirm}
          onChangeText={(t) => {
            setConfirm(t.replace(/\D/g, '').slice(0, 6));
            setError(null);
          }}
          keyboardType="number-pad"
          secureTextEntry
          containerStyle={styles.input}
          error={error ?? undefined}
        />

        <Button label="Enable Face ID" style={styles.action} onPress={() => void enable()} testID="enable-biometric" />
        <Button
          label="Not now"
          variant="secondary"
          style={styles.action}
          onPress={() => dispatch(dismissEnroll())}
          testID="skip-biometric"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'center' },
  hero: { alignItems: 'center', marginBottom: 24 },
  title: { marginTop: 16 },
  blurb: { marginTop: 8, textAlign: 'center' },
  input: { marginBottom: 12 },
  action: { marginTop: 10 },
});
