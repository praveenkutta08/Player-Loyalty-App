import React, { useMemo } from 'react';
import { Animated, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '../../theme/ThemeProvider';

import { sampleRange } from './sampling';
import { SplashEmblem, SplashWordmark } from './SplashChrome';
import { journeyFrame, journeyPathLength, NATIVE_DURATION_S } from './timeline';

import type { VariantProps } from './variants';

// Bundled default terrain (coast) — used when the manifest doesn't carry catalog paths, so a
// cold start with no cached manifest still renders (never blank, never blocked on network).
const DEFAULT_PATHS = {
  back: 'M0 172 Q25 164 50 172 Q75 179 100 168 L100 216 L0 216 Z',
  front: 'M0 186 Q30 180 58 187 Q80 192 100 184 L100 216 L0 216 Z',
};

const JOURNEY_PATH = 'M14 196 Q70 164 50 108';
const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * Destination Journey (P7.3): two terrain silhouettes (CMS environment theme — two SVG path
 * strings, animate the WRAPPER transform only), a hairline journey path drawn via dashoffset,
 * a traveling point of light evaluated on the same bézier as the studio, and the emblem
 * arriving at the destination.
 *
 * SVG props (dashoffset) can't run on the native driver, so this variant takes a SECOND,
 * JS-driven clock started in lockstep with the master clock — transform/opacity layers stay on
 * the UI thread; only the path draw + traveler ride the JS clock.
 */
export function JourneyVariant({
  progress,
  progressJs,
  brandName,
  tagline,
  environmentPaths,
}: VariantProps & {
  progressJs: Animated.Value;
  environmentPaths?: { back: string; front: string };
}): React.JSX.Element {
  const theme = useTheme();
  const T = NATIVE_DURATION_S.journey;
  const { width, height } = useWindowDimensions();
  const gold = theme.colors.brand.gold;
  const paths = environmentPaths ?? DEFAULT_PATHS;
  const pathLength = useMemo(() => journeyPathLength(), []);

  return (
    <View style={StyleSheet.absoluteFill} testID="splash-variant-journey">
      {/* Sunrise glow low over the land */}
      <Animated.View
        style={[
          styles.sunrise,
          {
            backgroundColor: gold,
            opacity: sampleRange(progress, (t) => journeyFrame(t).sunriseOpacity * 0.4, T),
            transform: [{ scale: sampleRange(progress, (t) => journeyFrame(t).sunriseScale, T) }],
          },
        ]}
      />

      {/* Terrain — two layers, wrapper transforms only (never animate path data). */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: sampleRange(progress, (t) => journeyFrame(t).terrainBack.opacity, T),
            transform: [
              { translateX: sampleRange(progress, (t) => journeyFrame(t).terrainBack.driftX, T) },
              {
                translateY: sampleRange(progress, (t) => journeyFrame(t).terrainBack.translateY, T),
              },
            ],
          },
        ]}
      >
        <Svg width="100%" height="100%" viewBox="0 0 100 216" preserveAspectRatio="none">
          <Path d={paths.back} fill={gold} fillOpacity={0.18} />
        </Svg>
      </Animated.View>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: sampleRange(progress, (t) => journeyFrame(t).terrainFront.opacity, T),
            transform: [
              { translateX: sampleRange(progress, (t) => journeyFrame(t).terrainFront.driftX, T) },
              {
                translateY: sampleRange(
                  progress,
                  (t) => journeyFrame(t).terrainFront.translateY,
                  T,
                ),
              },
            ],
          },
        ]}
      >
        <Svg width="100%" height="100%" viewBox="0 0 100 216" preserveAspectRatio="none">
          <Path d={paths.front} fill={gold} fillOpacity={0.1} />
        </Svg>
      </Animated.View>

      {/* Journey path — dashoffset draw + dissolve once its purpose is complete (JS clock). */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height="100%" viewBox="0 0 100 216" preserveAspectRatio="none">
          <AnimatedPath
            d={JOURNEY_PATH}
            stroke={gold}
            strokeWidth={0.7}
            fill="none"
            strokeDasharray={`${pathLength}`}
            strokeDashoffset={sampleRange(
              progressJs,
              (t) => (1 - journeyFrame(t).pathDashProgress) * pathLength,
              T,
            )}
            strokeOpacity={sampleRange(progressJs, (t) => journeyFrame(t).pathOpacity, T)}
          />
        </Svg>
      </View>

      {/* Traveler — an 8 dp warm-white dot riding the same bézier (JS clock: position props). */}
      <Animated.View
        testID="splash-traveler"
        style={[
          styles.traveler,
          {
            // Traveler dot ink from theme tokens (M18), not hardcoded cream.
            backgroundColor: theme.colors.text.primary,
            shadowColor: gold,
            opacity: sampleRange(progressJs, (t) => journeyFrame(t).traveler.opacity, T),
            transform: [
              {
                translateX: sampleRange(
                  progressJs,
                  (t) => (journeyFrame(t).traveler.x / 100) * width,
                  T,
                ),
              },
              {
                translateY: sampleRange(
                  progressJs,
                  (t) => (journeyFrame(t).traveler.y / 216) * height,
                  T,
                ),
              },
            ],
          },
        ]}
      />

      {/* Arrival pulse at the destination */}
      <Animated.View
        style={[
          styles.arrival,
          {
            borderColor: gold,
            width: width * 0.3,
            height: width * 0.3,
            borderRadius: (width * 0.3) / 2,
            marginLeft: (-width * 0.3) / 2,
            marginTop: (-width * 0.3) / 2,
            opacity: sampleRange(progress, (t) => journeyFrame(t).arrivalRing.opacity, T),
            transform: [
              { scale: sampleRange(progress, (t) => journeyFrame(t).arrivalRing.scale, T) },
            ],
          },
        ]}
      />

      <SplashEmblem
        progress={progress}
        T={T}
        brandName={brandName}
        opacity={(t) => journeyFrame(t).emblem.opacity}
        translateY={(t) => journeyFrame(t).handOff.handY}
        scale={(t) => journeyFrame(t).emblem.scale * journeyFrame(t).handOff.handScale}
      />
      <SplashWordmark
        progress={progress}
        T={T}
        brandName={brandName}
        tagline={tagline}
        frame={(t) => journeyFrame(t).wordmark}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sunrise: {
    position: 'absolute',
    left: '-15%',
    right: '-15%',
    top: '55%',
    height: '35%',
    borderRadius: 999,
  },
  traveler: {
    position: 'absolute',
    left: -4,
    top: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    // backgroundColor comes from theme tokens at the call site (M18)
    shadowOpacity: 0.8,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  arrival: { position: 'absolute', left: '50%', top: '50%', borderWidth: 1 },
});
