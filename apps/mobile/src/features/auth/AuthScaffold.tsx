import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { GlassCard, Kicker, ThemedText } from '../../components';
import { withAlpha } from '../../theme/color';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * Shared obsidian frame for the auth surfaces (RS1) — a full-bleed atmospheric backdrop (an indigo
 * glow fading into the obsidian void) with an "EXECUTIVE COMPANION"-style caps kicker, a Playfair
 * title, a floating glass action sheet 24px off the bottom, and an "OBSIDIAN LUXURY" footer rule.
 * No hardcoded color — the gradient/glow derive from theme tokens. Imagery is intentionally not
 * bundled; a tenant hero photo can layer over this backdrop later via the manifest.
 */
export function AuthScaffold({
  kicker,
  title,
  titleAccent,
  center,
  children,
}: {
  kicker: string;
  title: string;
  /** Optional italic-style accent line under the title (e.g. a name). */
  titleAccent?: string;
  /** Content shown between the header and the action sheet (e.g. the biometric orb). */
  center?: React.ReactNode;
  /** Action-sheet content (inputs, CTAs, links). */
  children: React.ReactNode;
}): React.JSX.Element {
  const theme = useTheme();
  const c = theme.colors;

  return (
    <View style={[styles.root, { backgroundColor: c.bg.base }]}>
      {/* Atmospheric backdrop: a faint indigo glow up top dissolving into the obsidian void. */}
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <LinearGradient id="authVoid" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c.bg.surface} />
            <Stop offset="1" stopColor={c.bg.base} />
          </LinearGradient>
          <RadialGradient id="authGlow" cx="50%" cy="28%" r="65%">
            <Stop offset="0" stopColor={withAlpha(c.brand.accent, 0.28)} />
            <Stop offset="1" stopColor={withAlpha(c.brand.accent, 0)} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#authVoid)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#authGlow)" />
      </Svg>

      <View style={[styles.body, { paddingHorizontal: theme.spacing.safe }]}>
        <View style={styles.header}>
          <Kicker>{kicker}</Kicker>
          <ThemedText variant="display" style={{ marginTop: theme.spacing.md }}>
            {title}
          </ThemedText>
          {titleAccent ? (
            <ThemedText
              variant="h1"
              color="secondary"
              style={{ fontStyle: 'italic', marginTop: theme.spacing.xs }}
            >
              {titleAccent}
            </ThemedText>
          ) : null}
        </View>

        {center ? <View style={styles.center}>{center}</View> : <View style={styles.center} />}

        <GlassCard style={{ marginBottom: theme.spacing.md }}>{children}</GlassCard>

        <View style={styles.footer}>
          <View style={[styles.rule, { backgroundColor: c.border.ghost ?? c.border.soft }]} />
          <Kicker color="faint" style={{ marginHorizontal: theme.spacing.md }}>
            Obsidian Luxury
          </Kicker>
          <View style={[styles.rule, { backgroundColor: c.border.ghost ?? c.border.soft }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1, paddingTop: 72, paddingBottom: 40 },
  header: {},
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  rule: { flex: 1, height: StyleSheet.hairlineWidth },
});
