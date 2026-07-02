import { BellRing, ShieldCheck } from 'lucide-react-native';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAppDispatch } from '../../app/store';
import { Button, ThemedText } from '../../components';
import { push } from '../../native/push';
import { useTheme } from '../../theme/ThemeProvider';
import { registerDevice } from '../auth/session';

import { setPushPromptResult } from './prefsSlice';

/**
 * H7 — push pre-permission screen. Shown once after first login, BEFORE the OS permission
 * prompt: the device token is registered only after the player agrees and the OS grants
 * permission (consent-ordered — never token-before-consent). Declining is remembered; the
 * player can enable pushes later from Notification Preferences.
 */
export function PushPermissionScreen(): React.JSX.Element {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const [busy, setBusy] = useState(false);

  const enable = async (): Promise<void> => {
    setBusy(true);
    try {
      const granted = await push.requestPermission();
      if (granted) {
        await registerDevice();
        dispatch(setPushPromptResult('enabled'));
      } else {
        dispatch(setPushPromptResult('declined'));
      }
    } catch {
      dispatch(setPushPromptResult('declined'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.bg.base, padding: theme.spacing.xl },
      ]}
    >
      <BellRing size={40} color={theme.colors.brand.gold} />
      <ThemedText variant="h2" style={[styles.centered, { marginTop: theme.spacing.md }]}>
        Stay in the loop
      </ThemedText>
      <ThemedText
        variant="body"
        color="muted"
        style={[styles.centered, { marginTop: theme.spacing.sm, marginBottom: theme.spacing.lg }]}
      >
        Get your offers, reservation updates and wallet alerts as they happen. You choose the
        channels — and quiet hours are always respected.
      </ThemedText>
      <View style={styles.purpose}>
        <ShieldCheck size={16} color={theme.colors.text.muted} />
        <ThemedText variant="label" color="muted" style={styles.purposeText}>
          We only register your device after you agree. Change your mind anytime in Notification
          Preferences.
        </ThemedText>
      </View>
      <Button
        label="Enable notifications"
        loading={busy}
        onPress={() => void enable()}
        testID="push-enable"
      />
      <Button
        label="Not now"
        variant="secondary"
        style={styles.skip}
        onPress={() => dispatch(setPushPromptResult('declined'))}
        testID="push-skip"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centered: { textAlign: 'center' },
  purpose: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  purposeText: { marginLeft: 8, flex: 1 },
  skip: { marginTop: 10 },
});
