import React from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { Button, ThemedText } from '../../components';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * G8 — force-update gate. Shown when the running app version is below the manifest's minimum
 * supported version (wired to the manifest in P4.2). Blocks the app until the user updates.
 */
export function ForceUpdateScreen(): React.JSX.Element {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.bg.base, padding: theme.spacing.xl },
      ]}
    >
      <ThemedText variant="h1" style={styles.centered}>
        Update required
      </ThemedText>
      <ThemedText
        variant="body"
        color="muted"
        style={[styles.centered, { marginTop: theme.spacing.md, marginBottom: theme.spacing.xl }]}
      >
        A newer version of the app is required to continue. Please update to keep playing.
      </ThemedText>
      <Button
        label="Update now"
        onPress={() => Linking.openURL('https://example.com/app-update')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centered: { textAlign: 'center' },
});
