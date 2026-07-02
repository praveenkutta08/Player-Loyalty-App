import { HelpCircle, ScanFace } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAppDispatch } from '../../../app/store';
import { Button, Input, Screen, ThemedText } from '../../../components';
import { biometrics } from '../../../native/biometrics';
import { useTheme } from '../../../theme/ThemeProvider';
import { unlock } from '../biometricSlice';
import { verifyPasscode } from '../biometricStore';
import { logout } from '../session';

/** After this many biometric failures we fall back to the passcode automatically. */
const MAX_BIOMETRIC_TRIES = 3;

/**
 * A2 / A6 — "Identify to Enter". Gates a restored session: Face/Touch ID first, with a passcode
 * fallback and a Help path (sign in with password). No secrets leave the device — success just
 * unlocks the already-validated session.
 */
export function LockScreen(): React.JSX.Element {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const [mode, setMode] = useState<'biometric' | 'passcode'>('biometric');
  const [, setTries] = useState(0);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const runBiometric = useCallback(async () => {
    setError(null);
    const ok = await biometrics.authenticate('Unlock your account');
    if (ok) {
      dispatch(unlock());
      return;
    }
    setTries((n) => {
      const next = n + 1;
      if (next >= MAX_BIOMETRIC_TRIES) setMode('passcode');
      return next;
    });
    setError('Face ID not recognized. Try again or use your passcode.');
  }, [dispatch]);

  useEffect(() => {
    if (mode === 'biometric') void runBiometric();
  }, [mode, runBiometric]);

  async function submitPasscode(): Promise<void> {
    if (await verifyPasscode(pin)) {
      dispatch(unlock());
    } else {
      setError('Incorrect passcode.');
      setPin('');
    }
  }

  return (
    <Screen>
      <View style={styles.center}>
        <ScanFace size={64} color={theme.colors.brand.gold} />
        <ThemedText variant="h2" style={styles.title}>
          Identify to enter
        </ThemedText>

        {mode === 'biometric' ? (
          <>
            <ThemedText variant="body" color="muted" style={styles.blurb}>
              Use Face ID to unlock your account.
            </ThemedText>
            {error ? (
              <ThemedText variant="label" style={[styles.error, { color: theme.colors.state.error }]}>
                {error}
              </ThemedText>
            ) : null}
            <Button label="Try Face ID" style={styles.action} onPress={() => void runBiometric()} testID="try-biometric" />
            <Button
              label="Use passcode"
              variant="secondary"
              style={styles.action}
              onPress={() => {
                setError(null);
                setMode('passcode');
              }}
              testID="use-passcode"
            />
          </>
        ) : (
          <>
            <Input
              label="Passcode"
              value={pin}
              onChangeText={(t) => {
                setPin(t.replace(/\D/g, '').slice(0, 6));
                setError(null);
              }}
              keyboardType="number-pad"
              secureTextEntry
              containerStyle={styles.input}
              error={error ?? undefined}
            />
            <Button
              label="Unlock"
              style={styles.action}
              disabled={pin.length < 4}
              onPress={() => void submitPasscode()}
              testID="submit-passcode"
            />
          </>
        )}

        <Button
          label="Help — sign in with password"
          variant="secondary"
          icon={<HelpCircle size={16} color={theme.colors.text.primary} />}
          style={styles.help}
          onPress={() => void logout()}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: 16 },
  blurb: { marginTop: 8, marginBottom: 16, textAlign: 'center' },
  error: { marginBottom: 12, textAlign: 'center' },
  input: { marginTop: 8, marginBottom: 8, width: '100%' },
  action: { marginTop: 10, alignSelf: 'stretch' },
  help: { marginTop: 24, alignSelf: 'stretch' },
});
