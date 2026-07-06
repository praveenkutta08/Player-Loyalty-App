import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { CapsLabel, ThemedText } from '../../components';
import { resolveAssetUri } from '../../lib/assetUri';
import { withAlpha } from '../../theme/color';
import { useTheme } from '../../theme/ThemeProvider';

/** Last-4 "member number" derived from the wallet UUID — a stable, real identifier, masked. */
function maskedNumber(walletId?: string): string {
  const hex = (walletId ?? '').replace(/[^0-9a-f]/gi, '');
  const last4 = hex.slice(-4).toUpperCase().padStart(4, '0');
  return `•••• •••• •••• ${last4}`;
}

/**
 * Digital member card (RS3, DESIGN.md → Wallet Cards): a metallic-grain slate card (radius 12) with
 * the loyalty tier in Playfair, a masked member number in utility-mono, and an indigo accent chip.
 * All color/geometry from tokens.
 */
export function MemberCard({
  tier,
  walletId,
  brandName,
  imageUri,
}: {
  tier?: string | null;
  walletId?: string;
  brandName: string;
  /** Optional per-tier card art (manifest `theme.tierCards`). Falls back to the metallic sheen. */
  imageUri?: string | null;
}): React.JSX.Element {
  const theme = useTheme();
  const c = theme.colors;
  const art = resolveAssetUri(imageUri);
  return (
    <View
      style={[
        styles.card,
        { borderRadius: theme.radius.wallet ?? 12, borderColor: c.border.ghost ?? c.border.strong },
      ]}
    >
      {art ? (
        <>
          {/* Tenant-uploaded tier art, full-bleed, with a bottom scrim so text stays legible. */}
          <Image source={{ uri: art }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
            <Defs>
              <LinearGradient id="memberScrim" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0.35" stopColor={c.bg.base} stopOpacity={0} />
                <Stop offset="1" stopColor={c.bg.base} stopOpacity={0.85} />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#memberScrim)" />
          </Svg>
        </>
      ) : (
        /* Metallic sheen: a diagonal slate gradient with a faint pearl highlight. */
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <LinearGradient id="memberGrain" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={c.bg.container ?? c.bg.elevated} />
              <Stop offset="0.55" stopColor={c.bg.elevated} />
              <Stop offset="1" stopColor={withAlpha(c.text.primary, 0.06)} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#memberGrain)" />
        </Svg>
      )}

      <View style={styles.top}>
        <CapsLabel color="secondary">{brandName}</CapsLabel>
        <View style={[styles.chip, { backgroundColor: withAlpha(c.brand.accent, 0.9) }]} />
      </View>

      <View style={styles.bottom}>
        <ThemedText variant="h1" style={styles.tier}>
          {tier ?? 'Member'}
        </ThemedText>
        <ThemedText variant="mono" color="secondary" style={styles.number}>
          {maskedNumber(walletId)}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 200,
    padding: 24,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chip: { width: 40, height: 28, borderRadius: 6 },
  bottom: { gap: 8 },
  tier: { textTransform: 'capitalize' },
  number: { letterSpacing: 2 },
});
