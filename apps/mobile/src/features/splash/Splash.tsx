import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { useReducedMotion } from '../../lib/reducedMotion';
import { useTheme } from '../../theme/ThemeProvider';

import { JourneyVariant } from './JourneyVariant';
import { resolveSplashConfig, type ResolvedSplashConfig } from './timeline';
import { CollectionVariant, PortalVariant, SilkVariant } from './variants';

/**
 * <Splash> — ONE component family for the four manifest-driven variants (P7.3), golden rule #5:
 * every value (variant, gradient, tagline, duration, environment) comes from the manifest
 * `splash` block; the app ships only the choreography.
 *
 * - Master clock: one Animated.Value, 0→1, LINEAR over the (rescaled) duration; per-element
 *   easing lives in the pure timeline evaluators, sampled into interpolations (native driver).
 *   `journey` gets a lockstep JS-driven clock for its SVG dashoffset/traveler only.
 * - Unknown/missing variant → `silk` (resolveSplashConfig; the server also falls back).
 * - OS reduced motion → ONE shared path for all variants: skip the timelines, 300 ms cross-fade
 *   of the final frame, then navigate.
 * - Ends with the shared hand-off baked into each timeline (scene fade + emblem toward the
 *   header slot), then fires onDone exactly once.
 */
export interface SplashProps {
  /** Raw manifest `splash` block (snake_case, as served); absent → bundled silk defaults. */
  splash?: Record<string, unknown> | null;
  brandName: string;
  memberTier?: string | null;
  onDone: () => void;
  /** Gallery/dev override so both motion paths are testable regardless of OS setting. */
  reducedMotionOverride?: boolean;
}

const FINAL_FRAME_PROGRESS = 0.9; // rest state after build-in, before the hand-off window

export function Splash({
  splash,
  brandName,
  memberTier,
  onDone,
  reducedMotionOverride,
}: SplashProps): React.JSX.Element {
  const theme = useTheme();
  const osReduced = useReducedMotion();
  const reduced = reducedMotionOverride ?? osReduced;
  const config: ResolvedSplashConfig = useMemo(() => resolveSplashConfig(splash), [splash]);

  const progress = useRef(new Animated.Value(reduced ? FINAL_FRAME_PROGRESS : 0)).current;
  const progressJs = useRef(new Animated.Value(reduced ? FINAL_FRAME_PROGRESS : 0)).current;
  const fade = useRef(new Animated.Value(reduced ? 0 : 1)).current;
  const done = useRef(false);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    const finish = (): void => {
      if (done.current) return;
      done.current = true;
      setRunning(false);
      onDone();
    };

    if (reduced) {
      // Shared reduced-motion path: final frame, 300 ms cross-fade, navigate.
      Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }).start(
        ({ finished }) => finished && finish(),
      );
      return;
    }

    const durationMs = config.durationS * 1000;
    const timing = { toValue: 1, duration: durationMs, easing: Easing.linear };
    // Journey's SVG props need a JS-driven twin clock; start both in lockstep.
    Animated.parallel([
      Animated.timing(progress, { ...timing, useNativeDriver: true }),
      Animated.timing(progressJs, { ...timing, useNativeDriver: false }),
    ]).start(({ finished }) => finished && finish());
    // The splash NEVER blocks on network: it plays to completion off cached/bundled config.
  }, [config.durationS, fade, onDone, progress, progressJs, reduced]);

  const [top, bottom] = config.backgroundValue ?? [theme.colors.bg.elevated, theme.colors.bg.base];

  const variantProps = {
    progress,
    brandName,
    tagline: config.taglineText,
    memberTier,
  };

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { opacity: fade }]}
      pointerEvents={running ? 'auto' : 'none'}
      testID="splash-root"
    >
      {/* Full-bleed 2-stop vertical gradient (approximated with a soft two-layer blend —
          react-native-linear-gradient is a native dep; backgroundValue[1] is the base). */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: bottom }]} />
      <View style={[styles.gradientTop, { backgroundColor: top }]} />

      {config.variant === 'journey' ? (
        <JourneyVariant
          {...variantProps}
          progressJs={progressJs}
          environmentPaths={config.environmentThemePaths}
        />
      ) : config.variant === 'collection' ? (
        <CollectionVariant {...variantProps} />
      ) : config.variant === 'portal' ? (
        <PortalVariant {...variantProps} />
      ) : (
        <SilkVariant {...variantProps} />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Top half fading toward the base color ≈ the 178° two-stop gradient with a 72% stop.
  gradientTop: { position: 'absolute', left: 0, right: 0, top: 0, height: '45%', opacity: 0.55 },
});
