import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button, Screen, SegmentedControl, ThemedText, Toggle } from '../../components';
import { useTheme } from '../../theme/ThemeProvider';

import { Splash } from './Splash';
import { SPLASH_VARIANTS, type SplashVariantKey } from './timeline';

/**
 * Dev gallery (P7.3): every splash variant × light/dark (via the app theme toggle) ×
 * reduced-motion × (collection: logged-in/out). Replays on demand — the production splash
 * itself plays once per cold start.
 */
export function SplashGalleryScreen(): React.JSX.Element {
  const theme = useTheme();
  const [variant, setVariant] = useState<SplashVariantKey>('silk');
  const [reduced, setReduced] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [runKey, setRunKey] = useState(0);
  const [playing, setPlaying] = useState(false);

  const splashConfig: Record<string, unknown> = {
    variant,
    tagline_text: 'GRAND RESORT & CLUB',
    background_value: ['#241626', '#0A0710'],
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <ThemedText variant="body" color="muted">
          The four manifest-driven splash experiences. Toggle the app theme in Appearance for
          light/dark; reduced motion uses the shared cross-fade path.
        </ThemedText>

        <SegmentedControl
          segments={SPLASH_VARIANTS.map((key) => ({ key, label: key }))}
          value={variant}
          onChange={setVariant}
        />

        <View style={styles.toggles}>
          <View style={styles.toggleRow}>
            <ThemedText variant="label" color="muted">
              Reduced motion
            </ThemedText>
            <Toggle value={reduced} onValueChange={setReduced} testID="gallery-reduced" />
          </View>
          {variant === 'collection' ? (
            <View style={styles.toggleRow}>
              <ThemedText variant="label" color="muted">
                Logged in (tier card)
              </ThemedText>
              <Toggle value={loggedIn} onValueChange={setLoggedIn} testID="gallery-loggedin" />
            </View>
          ) : null}
        </View>

        <Button
          label={playing ? 'Playing…' : 'Play'}
          disabled={playing}
          onPress={() => {
            setRunKey((k) => k + 1);
            setPlaying(true);
          }}
          testID="gallery-play"
        />

        {/* Stage — the splash renders inside this frame at device aspect. */}
        <View
          style={[styles.stage, { borderColor: theme.colors.border.soft }]}
          testID="gallery-stage"
        >
          {playing ? (
            <Splash
              key={`${variant}-${runKey}-${reduced}-${loggedIn}`}
              splash={splashConfig}
              brandName="Meridian"
              memberTier={variant === 'collection' && loggedIn ? 'gold' : null}
              reducedMotionOverride={reduced}
              onDone={() => setPlaying(false)}
            />
          ) : (
            <ThemedText variant="label" color="faint" style={styles.stageHint}>
              Press Play to run the {variant} timeline
            </ThemedText>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 16, paddingBottom: 32, gap: 14 },
  toggles: { gap: 8 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stage: {
    height: 520,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageHint: { textAlign: 'center' },
});
