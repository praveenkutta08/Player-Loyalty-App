import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { NavBarVisual } from '../../app/navigation/NavBarVisual';
import { DEFAULT_NAV, resolveTabs } from '../../app/navigation/navConfig';
import { EDITORIAL, FLOATING_PILL, type NavStyleKey } from '../../app/navigation/navStyles';
import { Card, Screen, SegmentedControl, ThemedText, Toggle } from '../../components';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * Dev gallery + the P7.4 design presentation: both bar styles × 4/5 tabs × cashless on/off,
 * light/dark via the app theme toggle, with the exact dp specs annotated per style. The bars
 * below are the REAL NavBarVisual renderer — what ships is what you see.
 */
export function NavStylesGalleryScreen(): React.JSX.Element {
  const theme = useTheme();
  const [styleKey, setStyleKey] = useState<NavStyleKey>('editorial');
  const [cashless, setCashless] = useState(true);
  const [fiveTabs, setFiveTabs] = useState(true);
  const [active, setActive] = useState('Home');

  const nav = fiveTabs
    ? DEFAULT_NAV
    : { ...DEFAULT_NAV, tabs: DEFAULT_NAV.tabs.filter((t) => t.key !== 'account') };
  const tabs = resolveTabs(nav, (flag) => (flag === 'cashless' ? cashless : true));

  const spec =
    styleKey === 'editorial'
      ? [
          ['Bar', `docked · ${EDITORIAL.barHeight}dp + safe-area · hairline top border`],
          ['Icons / labels', `${EDITORIAL.iconSize}dp · ${EDITORIAL.labelSize}sp always visible`],
          ['Active', 'gold icon + gold 600-weight label (type carries the state)'],
          ['Center', `inline ${EDITORIAL.centerBadgeSize}dp gold circle, onGold glyph`],
        ]
      : [
          [
            'Bar',
            `detached · ${FLOATING_PILL.barHeight}dp · radius ${FLOATING_PILL.radius} · margin ${FLOATING_PILL.horizontalMargin}dp · bottom max(inset,12)+8`,
          ],
          ['Surface', 'translucent bg.elevated (iOS ≈ blur stand-in; Android solid) + hairline'],
          ['Active', `gold icon + ${FLOATING_PILL.activeDotSize}dp gold dot (icon-forward)`],
          [
            'Center',
            `${FLOATING_PILL.centerSize}dp gold circle raised ${FLOATING_PILL.centerRaise}dp, gold-only glow`,
          ],
        ];

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <ThemedText variant="body" color="muted">
          The two `navigation.style` skins — same Option B slots, same center Scan/Play fallback,
          only the visual treatment changes. Toggle the app theme in Appearance for light/dark.
        </ThemedText>

        <SegmentedControl
          segments={[
            { key: 'editorial' as const, label: 'Editorial' },
            { key: 'floatingPill' as const, label: 'Floating Pill' },
          ]}
          value={styleKey}
          onChange={setStyleKey}
        />

        <View style={styles.toggleRow}>
          <ThemedText variant="label" color="muted">
            Cardless flag (center action)
          </ThemedText>
          <Toggle value={cashless} onValueChange={setCashless} testID="nav-gallery-cashless" />
        </View>
        <View style={styles.toggleRow}>
          <ThemedText variant="label" color="muted">
            5 tabs (off = 4)
          </ThemedText>
          <Toggle value={fiveTabs} onValueChange={setFiveTabs} testID="nav-gallery-tabs" />
        </View>

        {/* Stage — device-ish frame with the real renderer, gesture-nav inset simulated. */}
        <View
          style={[styles.stage, { borderColor: theme.colors.border.soft }]}
          testID="nav-gallery-stage"
        >
          <View style={styles.stageBody} />
          <NavBarVisual
            styleKey={styleKey}
            tabs={tabs}
            activeRoute={active}
            onPress={setActive}
            safeAreaBottom={24}
          />
        </View>

        {/* The annotated spec (the P7.4 design presentation). */}
        <Card style={styles.specCard}>
          <ThemedText variant="title">
            {styleKey === 'editorial' ? 'Editorial — spec' : 'Floating Pill — spec'}
          </ThemedText>
          {spec.map(([label, value]) => (
            <View key={label} style={styles.specRow}>
              <ThemedText variant="label" color="muted" style={styles.specLabel}>
                {label}
              </ThemedText>
              <ThemedText variant="body" color="secondary" style={styles.specValue}>
                {value}
              </ThemedText>
            </View>
          ))}
          <ThemedText variant="label" color="faint" style={styles.specNote}>
            Presets are fixed per style — no free-form radius/elevation/blur fields. Motion: static
            state changes only (reduced-motion safe by construction).
          </ThemedText>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 16, paddingBottom: 32, gap: 14 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stage: {
    height: 220,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  stageBody: { flex: 1 },
  specCard: { gap: 8 },
  specRow: { flexDirection: 'row', gap: 10 },
  specLabel: { width: 96 },
  specValue: { flex: 1 },
  specNote: { marginTop: 6 },
});
