import React from 'react';
import { Animated, StyleSheet, useWindowDimensions, View } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';

import { sampleRange } from './sampling';

import type { WordmarkFrame } from './timeline';

/**
 * Shared splash chrome (P7.3): the fixed layout every variant uses — emblem slot (96 dp box,
 * centered at 50% H), wordmark block (name / accent rule / tagline at 60% H), all animated off
 * the same master clock. Layout numbers follow the handoff README ("Screen Layout").
 */

export function SplashEmblem({
  progress,
  T,
  brandName,
  opacity,
  translateY,
  scale,
  size = 96,
}: {
  progress: Animated.Value;
  T: number;
  brandName: string;
  opacity: (t: number) => number;
  translateY: (t: number) => number;
  scale: (t: number) => number;
  size?: number;
}): React.JSX.Element {
  const theme = useTheme();
  return (
    <Animated.View
      testID="splash-emblem"
      style={[
        styles.emblem,
        {
          width: size,
          height: size,
          marginLeft: -size / 2,
          marginTop: -size / 2,
          opacity: sampleRange(progress, opacity, T),
          transform: [
            { translateY: sampleRange(progress, translateY, T) },
            { scale: sampleRange(progress, scale, T) },
          ],
        },
      ]}
    >
      {/* The tenant logo (CMS asset) fits this box; monogram fallback until assets resolve.
          Blur beats are approximated by the opacity ramp (cross-fade approach per the spec —
          no runtime blur on low-end Android). */}
      <View
        style={[
          styles.monogram,
          { borderColor: theme.colors.brand.gold, backgroundColor: 'transparent' },
        ]}
      >
        <Animated.Text
          style={[
            styles.monogramText,
            { color: theme.colors.brand.gold, fontFamily: theme.fontFamily.display },
          ]}
        >
          {brandName.slice(0, 1).toUpperCase()}
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

export function SplashWordmark({
  progress,
  T,
  brandName,
  tagline,
  frame,
  topPct = 60,
}: {
  progress: Animated.Value;
  T: number;
  brandName: string;
  tagline?: string;
  frame: (t: number) => WordmarkFrame;
  topPct?: number;
}): React.JSX.Element {
  const theme = useTheme();
  const { height } = useWindowDimensions();
  const gold = theme.colors.brand.gold;
  // Wordmark ink comes from the resolved theme (M18) — a light-brand tenant gets its own
  // primary text color, not hardcoded cream/espresso art values.
  const cream = theme.colors.text.primary;
  return (
    <View style={[styles.wordmarkBlock, { top: height * (topPct / 100) }]} pointerEvents="none">
      <Animated.Text
        testID="splash-name"
        numberOfLines={1}
        style={[
          styles.name,
          {
            color: cream,
            fontFamily: theme.fontFamily.display,
            opacity: sampleRange(progress, (t) => frame(t).nameOpacity, T),
            transform: [{ translateY: sampleRange(progress, (t) => frame(t).nameTranslateY, T) }],
          },
        ]}
      >
        {brandName.toUpperCase()}
      </Animated.Text>
      <Animated.View
        style={[
          styles.rule,
          {
            backgroundColor: gold,
            opacity: sampleRange(progress, (t) => frame(t).ruleOpacity, T),
            transform: [{ scaleX: sampleRange(progress, (t) => frame(t).ruleScaleX, T) }],
          },
        ]}
      />
      {tagline ? (
        <Animated.Text
          testID="splash-tagline"
          style={[
            styles.tagline,
            {
              color: gold,
              fontFamily: theme.fontFamily.sans,
              opacity: sampleRange(progress, (t) => frame(t).tagOpacity, T),
              transform: [{ translateY: sampleRange(progress, (t) => frame(t).tagTranslateY, T) }],
            },
          ]}
        >
          {tagline.toUpperCase()}
        </Animated.Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  emblem: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monogram: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monogramText: { fontSize: 40 },
  wordmarkBlock: { position: 'absolute', left: 24, right: 24, alignItems: 'center', gap: 20 },
  name: { fontSize: 28, letterSpacing: 8.4 }, // +0.30em at 28dp
  rule: { width: 54, height: 1 },
  tagline: { fontSize: 11, letterSpacing: 3.7 }, // +0.34em at 11dp
});
