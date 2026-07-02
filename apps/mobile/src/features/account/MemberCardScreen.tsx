import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useManifest } from '../../app/manifest/ManifestProvider';
import { Card, Screen, ThemedText } from '../../components';
import { useTheme } from '../../theme/ThemeProvider';

import { useGetAccountMeQuery } from './accountApi';
import { tierProgress } from './tiers';

/**
 * C2 — Digital member card. Renders the tenant-branded card face with the member ID and a
 * simulated barcode (staff scan at the property). No wallet/PAN here — this is a loyalty card.
 */
export function MemberCardScreen(): React.JSX.Element {
  const theme = useTheme();
  const { manifest } = useManifest();
  const me = useGetAccountMeQuery();

  const memberId = me.data?.id ?? '—';
  const memberName = me.data?.email?.split('@')[0] ?? 'Member';
  const tier = tierProgress(me.data?.points ?? 0, me.data?.tier ?? 'bronze').current;

  return (
    <Screen>
      <View style={styles.center}>
        <Card style={[styles.card, { backgroundColor: theme.colors.brand.gold }]}>
          <ThemedText variant="kicker" style={{ color: theme.colors.brand.onGold }}>
            {manifest?.name ?? 'Member Club'}
          </ThemedText>
          <ThemedText variant="h1" style={[styles.name, { color: theme.colors.brand.onGold }]}>
            {memberName}
          </ThemedText>

          <View style={styles.tierRow}>
            <ThemedText variant="label" style={{ color: theme.colors.brand.onGold }}>
              {tier.label} Tier
            </ThemedText>
          </View>

          {/* Simulated barcode (visual only; property scanners resolve the member ID). */}
          <View style={styles.barcode}>
            {barcodeBars(memberId).map((w, i) => (
              <View
                key={`bar-${i}-${w}`}
                style={[styles.bar, { width: w, backgroundColor: theme.colors.brand.onGold }]}
              />
            ))}
          </View>

          <ThemedText variant="mono" style={[styles.id, { color: theme.colors.brand.onGold }]}>
            {formatMemberId(memberId)}
          </ThemedText>
        </Card>

        <ThemedText variant="body" color="muted" style={styles.hint}>
          Show this card to a host or scan at any kiosk to earn and redeem.
        </ThemedText>
      </View>
    </Screen>
  );
}

/** Deterministic bar widths from the member id so the barcode is stable per member (decorative). */
function barcodeBars(seed: string): number[] {
  const widths = [1, 2, 3, 1, 2, 1, 3, 2];
  return Array.from({ length: 40 }, (_, i) => {
    const code = seed.charCodeAt(i % seed.length) || 1;
    return widths[(code + i) % widths.length];
  });
}

/** Group the member id into readable blocks (e.g. UUID → 4-char groups). */
function formatMemberId(id: string): string {
  return id
    .replace(/-/g, '')
    .slice(0, 16)
    .toUpperCase()
    .replace(/(.{4})/g, '$1 ')
    .trim();
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center' },
  card: { paddingVertical: 28 },
  name: { marginTop: 4 },
  tierRow: { marginTop: 8 },
  barcode: { flexDirection: 'row', alignItems: 'flex-end', height: 56, marginTop: 28, gap: 2 },
  bar: { height: '100%' },
  id: { marginTop: 16, letterSpacing: 2 },
  hint: { textAlign: 'center', marginTop: 24 },
});
