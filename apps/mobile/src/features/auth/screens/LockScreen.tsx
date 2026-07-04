import { ScanFace } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useAppDispatch } from '../../../app/store';
import { Input, Kicker, PillButton, ThemedText } from '../../../components';
import { biometrics } from '../../../native/biometrics';
import { withAlpha } from '../../../theme/color';
import { useTheme } from '../../../theme/ThemeProvider';
import { AuthScaffold } from '../AuthScaffold';
import { unlock } from '../biometricSlice';
import { verifyPasscode } from '../biometricStore';
import { logout } from '../session';

/** After this many biometric failures we fall back to the passcode automatically. */
const MAX_BIOMETRIC_TRIES = 3;

/** Glowing indigo "biometric active" orb (RS1) — concentric ghost rings around a Face-ID glyph. */
function BiometricOrb(): React.JSX.Element {
  const theme = useTheme();
  const indigo = theme.colors.brand.accent;
  return (
    <View style={styles.orbWrap}>
      <View style={[styles.ring, styles.ringOuter, { borderColor: withAlpha(indigo, 0.15) }]} />
      <View style={[styles.ring, styles.ringMid, { borderColor: withAlpha(indigo, 0.3) }]} />
      <View
        style={[
          styles.orb,
          { backgroundColor: withAlpha(indigo, 0.12), borderColor: withAlpha(indigo, 0.5) },
        ]}
      >
        <ScanFace size={44} color={indigo} />
      </View>
    </View>
  );
}

/**
 * A2 / A6 — "Identify to Enter", re-skinned to obsidian luxury (RS1). Face/Touch ID first behind a
 * glowing orb, with a passcode fallback and a Help path (sign in with password). No secrets leave
 * the device — success just unlocks the already-validated session. Auth logic is unchanged.
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

  const center =
    mode === 'biometric' ? (
      <>
        <BiometricOrb />
        <Kicker color="secondary" style={{ marginTop: theme.spacing.lg }}>
          Biometric Active
        </Kicker>
      </>
    ) : null;

  return (
    <AuthScaffold kicker="Executive Companion" title="Welcome back" center={center}>
      {mode === 'biometric' ? (
        <>
          {error ? (
            <ThemedText variant="label" style={[styles.error, { color: theme.colors.state.error }]}>
              {error}
            </ThemedText>
          ) : null}
          <PillButton
            label="Identify to enter"
            variant="accent"
            block
            onPress={() => void runBiometric()}
            testID="try-biometric"
          />
          <View style={styles.links}>
            <Pressable
              onPress={() => {
                setError(null);
                setMode('passcode');
              }}
              hitSlop={8}
              testID="use-passcode"
            >
              <ThemedText variant="label" style={{ color: theme.colors.brand.accent }}>
                Use passcode
              </ThemedText>
            </Pressable>
            <Pressable onPress={() => void logout()} hitSlop={8}>
              <ThemedText variant="label" color="muted">
                Help
              </ThemedText>
            </Pressable>
          </View>
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
            containerStyle={styles.field}
            error={error ?? undefined}
          />
          <PillButton
            label="Unlock"
            variant="accent"
            block
            disabled={pin.length < 4}
            onPress={() => void submitPasscode()}
            testID="submit-passcode"
          />
          <View style={styles.links}>
            <Pressable onPress={() => void logout()} hitSlop={8}>
              <ThemedText variant="label" color="muted">
                Help — sign in with password
              </ThemedText>
            </Pressable>
          </View>
        </>
      )}
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  error: { textAlign: 'center', marginBottom: 12 },
  field: { marginBottom: 8 },
  links: { marginTop: 20, flexDirection: 'row', justifyContent: 'space-between' },
  orbWrap: { alignItems: 'center', justifyContent: 'center', width: 200, height: 200 },
  ring: { position: 'absolute', borderWidth: StyleSheet.hairlineWidth, borderRadius: 999 },
  ringOuter: { width: 200, height: 200 },
  ringMid: { width: 150, height: 150 },
  orb: {
    width: 100,
    height: 100,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
