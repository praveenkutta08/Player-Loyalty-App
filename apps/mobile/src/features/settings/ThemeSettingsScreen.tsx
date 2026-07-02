import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useManifest } from '../../app/manifest/ManifestProvider';
import { useFeatures } from '../../app/providers/FeatureProvider';
import { Button, Card, ListRow, Screen, StatusPill, ThemedText, Toggle } from '../../components';
import { useTheme } from '../../theme/ThemeProvider';
import { logout } from '../auth/session';

import type { MoreStackParamList } from '../more/types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

/**
 * M4 — theme / appearance. Lets the player switch light/dark (tenant-permitted) and surfaces the
 * live manifest (tenant name, version, active feature flags) so manifest-driven theming + flags are
 * visible end-to-end: editing the tenant's theme/flags in the admin re-themes here with no rebuild.
 */
export function ThemeSettingsScreen(): React.JSX.Element {
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<MoreStackParamList>>();
  const { manifest, status } = useManifest();
  const { flags } = useFeatures();
  const enabledFlags = Object.entries(flags).filter(([, on]) => on);

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ThemedText variant="h1" style={{ marginBottom: theme.spacing.lg }}>
          Appearance
        </ThemedText>

        <Card style={styles.row}>
          <View style={{ flex: 1 }}>
            <ThemedText variant="title">Dark mode</ThemedText>
            <ThemedText variant="body" color="muted">
              Currently {theme.scheme}
            </ThemedText>
          </View>
          <Toggle
            testID="dark-toggle"
            value={theme.scheme === 'dark'}
            onValueChange={theme.toggleScheme}
          />
        </Card>

        <ThemedText variant="label" color="muted" style={styles.sectionLabel}>
          Brand (from manifest)
        </ThemedText>
        <Card>
          <ThemedText variant="title">{manifest?.name ?? '—'}</ThemedText>
          <ThemedText variant="body" color="muted">
            {manifest ? `v${manifest.version} · ${manifest.tenantSlug}` : 'Loading…'}
          </ThemedText>
          <View style={styles.pillRow}>
            <StatusPill
              label={status === 'offline' ? 'Offline' : 'Live'}
              tone={status === 'offline' ? 'warning' : 'success'}
            />
          </View>
        </Card>

        <ThemedText variant="label" color="muted" style={styles.sectionLabel}>
          Active features
        </ThemedText>
        <Card>
          {enabledFlags.length === 0 ? (
            <ThemedText variant="body" color="muted">
              No features enabled.
            </ThemedText>
          ) : (
            <View style={styles.pillWrap}>
              {enabledFlags.map(([name]) => (
                <View key={name} style={styles.pillItem}>
                  <StatusPill label={name} tone="info" />
                </View>
              ))}
            </View>
          )}
        </Card>

        {__DEV__ ? (
          <>
            <ThemedText variant="label" color="muted" style={styles.sectionLabel}>
              Developer
            </ThemedText>
            <Card>
              <ListRow
                title="Concierge kit gallery"
                subtitle="All components × states (dev only)"
                onPress={() => navigation.navigate('ConciergeKit')}
              />
              <ListRow
                title="Splash variants"
                subtitle="4 timelines × reduced-motion × member states (dev only)"
                onPress={() => navigation.navigate('SplashGallery')}
              />
              <ListRow
                title="Nav bar styles"
                subtitle="Editorial vs Floating Pill + dp specs (dev only)"
                onPress={() => navigation.navigate('NavStylesGallery')}
              />
            </Card>
          </>
        ) : null}

        <Button
          label="Log out"
          variant="secondary"
          onPress={() => void logout()}
          testID="logout"
          style={styles.logout}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  sectionLabel: { marginTop: 24, marginBottom: 8 },
  pillRow: { marginTop: 12, flexDirection: 'row' },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  pillItem: { marginRight: 8, marginBottom: 8 },
  logout: { marginTop: 32 },
});
