import { LogOut, ScanFace } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useAppDispatch, useAppSelector } from '../../app/store';
import { Button, Card, Input, Screen, ThemedText, Toggle } from '../../components';
import { useTheme } from '../../theme/ThemeProvider';
import { dismissEnroll, setEnabled } from '../auth/biometricSlice';
import {
  clearBiometric,
  isValidPasscode,
  setBiometricEnabled,
  setPasscode,
} from '../auth/biometricStore';
import { logout } from '../auth/session';

/**
 * M2 — Security settings: enable/disable biometric unlock (enabling requires a passcode fallback),
 * change the passcode, and sign out. All on-device; the backend still validates the session.
 */
export function SecuritySettingsScreen(): React.JSX.Element {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { available, enabled } = useAppSelector((s) => s.biometric);

  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function toggle(next: boolean): Promise<void> {
    if (!next) {
      await clearBiometric();
      dispatch(setEnabled(false));
      return;
    }
    // Enabling requires a passcode — reveal the field and confirm on save.
    setShowPin(true);
  }

  async function savePasscode(): Promise<void> {
    if (!isValidPasscode(pin)) {
      setError('Passcode must be 4–6 digits.');
      return;
    }
    await setPasscode(pin);
    await setBiometricEnabled(true);
    dispatch(setEnabled(true));
    dispatch(dismissEnroll());
    setShowPin(false);
    setPin('');
    setError(null);
  }

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <ThemedText variant="label" color="muted" style={styles.label}>
          Security
        </ThemedText>
        <Card style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowBody}>
              <ThemedText variant="title">Biometric unlock</ThemedText>
              <ThemedText variant="label" color="muted">
                {available ? 'Use Face ID to unlock the app' : 'No biometric sensor available'}
              </ThemedText>
            </View>
            <Toggle
              value={enabled}
              disabled={!available}
              onValueChange={(v) => void toggle(v)}
              testID="biometric-toggle"
            />
          </View>

          {showPin ? (
            <View style={styles.pinBlock}>
              <Input
                label="Set passcode (4–6 digits)"
                value={pin}
                onChangeText={(t) => {
                  setPin(t.replace(/\D/g, '').slice(0, 6));
                  setError(null);
                }}
                keyboardType="number-pad"
                secureTextEntry
                error={error ?? undefined}
              />
              <Button
                label="Save"
                icon={<ScanFace size={16} color={theme.colors.brand.onGold} />}
                style={styles.save}
                onPress={() => void savePasscode()}
                testID="save-passcode"
              />
            </View>
          ) : null}
        </Card>

        <Button
          label="Sign out"
          variant="secondary"
          icon={<LogOut size={16} color={theme.colors.text.primary} />}
          style={styles.signOut}
          onPress={() => void logout()}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 16, paddingBottom: 32 },
  label: { marginBottom: 8 },
  card: { marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBody: { flex: 1, marginRight: 12 },
  pinBlock: { marginTop: 16 },
  save: { marginTop: 12, alignSelf: 'flex-start' },
  signOut: { marginTop: 8 },
});
