import React from 'react';
import { Animated, StyleSheet, useWindowDimensions, View } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';

import { sampleRange } from './sampling';
import { SplashEmblem, SplashWordmark } from './SplashChrome';
import { collectionFrame, NATIVE_DURATION_S, portalFrame, silkFrame } from './timeline';

/**
 * Silk / Portal / Collection splash variants (P7.3) — layers sample the pure timeline
 * evaluators; every animated property is opacity/transform only (handoff budget rules).
 */

export interface VariantProps {
  progress: Animated.Value;
  brandName: string;
  tagline?: string;
  /** Collection privacy rule: tier label only when logged in; NEVER a real card number. */
  memberTier?: string | null;
}

// --------------------------------------------------------------------------------------- silk
export function SilkVariant({ progress, brandName, tagline }: VariantProps): React.JSX.Element {
  const theme = useTheme();
  const T = NATIVE_DURATION_S.silk;
  const { width } = useWindowDimensions();
  const gold = theme.colors.brand.gold;

  // Pre-blurred ribbon look via layered translucent bands (no runtime blur — spec note).
  const ribbon = (
    key: 'ribbonA' | 'ribbonB' | 'ribbonC',
    top: string,
    rotate: number,
    height: number,
  ) => (
    <Animated.View
      key={key}
      style={[
        styles.ribbon,
        {
          top: top as `${number}%`,
          height,
          backgroundColor: gold,
          opacity: sampleRange(progress, (t) => silkFrame(t)[key].opacity, T),
          transform: [
            {
              translateX: sampleRange(
                progress,
                (t) => (silkFrame(t)[key].translateX / 100) * width,
                T,
              ),
            },
            { rotate: `${rotate}deg` },
          ],
        },
      ]}
    />
  );

  return (
    <View style={StyleSheet.absoluteFill} testID="splash-variant-silk">
      <Animated.View
        style={[
          styles.bloom,
          {
            backgroundColor: gold,
            opacity: sampleRange(progress, (t) => silkFrame(t).bloomOpacity * 0.3, T),
          },
        ]}
      />
      {ribbon('ribbonA', '34%', -16, width * 0.13)}
      {ribbon('ribbonB', '45%', -10, width * 0.15)}
      {ribbon('ribbonC', '57%', -13, width * 0.11)}
      <SplashEmblem
        progress={progress}
        T={T}
        brandName={brandName}
        opacity={(t) => silkFrame(t).emblem.opacity}
        translateY={(t) => silkFrame(t).emblem.translateY + silkFrame(t).handOff.handY}
        scale={(t) => silkFrame(t).emblem.scale * silkFrame(t).handOff.handScale}
      />
      <SplashWordmark
        progress={progress}
        T={T}
        brandName={brandName}
        tagline={tagline}
        frame={(t) => silkFrame(t).wordmark}
      />
    </View>
  );
}

// ------------------------------------------------------------------------------------- portal
export function PortalVariant({ progress, brandName, tagline }: VariantProps): React.JSX.Element {
  const theme = useTheme();
  const T = NATIVE_DURATION_S.portal;
  const { width } = useWindowDimensions();
  const gold = theme.colors.brand.gold;
  const ringSize = width * 0.46;

  return (
    <View style={StyleSheet.absoluteFill} testID="splash-variant-portal">
      {/* Interior light */}
      <Animated.View
        style={[
          circle(width * 0.52),
          styles.centered,
          {
            backgroundColor: gold,
            opacity: sampleRange(progress, (t) => portalFrame(t).bloomOpacity * 0.35, T),
            transform: [{ scale: sampleRange(progress, (t) => portalFrame(t).bloomScale, T) }],
          },
        ]}
      />
      {/* Aperture ring (HERO) — plain View, hairline border, static shadow (spec note). */}
      <Animated.View
        style={[
          circle(ringSize),
          styles.centered,
          styles.ring,
          {
            borderColor: gold,
            shadowColor: gold,
            opacity: sampleRange(progress, (t) => portalFrame(t).ringOpacity, T),
            transform: [
              {
                translateY: sampleRange(progress, (t) => portalFrame(t).handOff.handY, T),
              },
              {
                scale: sampleRange(
                  progress,
                  (t) => portalFrame(t).ringScale * portalFrame(t).handOff.handScale,
                  T,
                ),
              },
            ],
          },
        ]}
      />
      {/* Outer frame echo */}
      <Animated.View
        style={[
          circle(ringSize),
          styles.centered,
          styles.frame,
          {
            borderColor: gold,
            opacity: sampleRange(progress, (t) => portalFrame(t).frameOpacity, T),
            transform: [{ scale: sampleRange(progress, (t) => portalFrame(t).frameScale, T) }],
          },
        ]}
      />
      {/* Emblem — LOW-END FALLBACK reveal from the spec (opacity + scale 1.05→1.00, no mask):
          the masked-view/Skia circular clip needs a native module this repo mocks by policy. */}
      <SplashEmblem
        progress={progress}
        T={T}
        brandName={brandName}
        opacity={(t) => portalFrame(t).emblemOpacity}
        translateY={(t) => portalFrame(t).handOff.handY}
        scale={(t) => portalFrame(t).emblemScale * portalFrame(t).handOff.handScale}
      />
      <SplashWordmark
        progress={progress}
        T={T}
        brandName={brandName}
        tagline={tagline}
        frame={(t) => portalFrame(t).wordmark}
      />
    </View>
  );
}

// --------------------------------------------------------------------------------- collection
export function CollectionVariant({
  progress,
  brandName,
  tagline,
  memberTier,
}: VariantProps): React.JSX.Element {
  const theme = useTheme();
  const T = NATIVE_DURATION_S.collection;
  const { width, height } = useWindowDimensions();
  const gold = theme.colors.brand.gold;
  const cardW = width * 0.6;
  const cardH = width * 0.38;

  const card = (
    key: 'card1' | 'card2' | 'card3',
    colors: { backgroundColor: string; borderColor: string },
    isTop: boolean,
  ) => (
    <Animated.View
      key={key}
      testID={isTop ? 'splash-top-card' : undefined}
      style={[
        styles.card,
        colors,
        {
          width: cardW,
          height: cardH,
          borderRadius: width * 0.04,
          left: (width - cardW) / 2,
          top: height * 0.4 - cardH / 2,
          opacity: sampleRange(progress, (t) => collectionFrame(t)[key].opacity, T),
          transform: [
            {
              translateY: sampleRange(
                progress,
                (t) =>
                  (collectionFrame(t)[key].translateYPct / 100) * cardH +
                  (collectionFrame(t).stackRecedeY / 100) * height,
                T,
              ),
            },
            {
              rotate: sampleRange(progress, (t) => collectionFrame(t)[key].rotate, T).interpolate({
                inputRange: [-360, 360],
                outputRange: ['-360deg', '360deg'],
              }),
            },
            { scale: sampleRange(progress, (t) => collectionFrame(t).stackScale, T) },
          ],
        },
      ]}
    >
      {/* Brand monogram on every card. PRIVACY (decided interim rule): logged-out shows
          generic brand cards — no tier label, no card number. Logged-in shows the tier label
          only; the "number" is always decorative masked digits, NEVER real. */}
      <View style={styles.cardEmblem}>
        <Animated.Text style={[styles.cardEmblemText, { color: gold }]}>
          {brandName.slice(0, 1).toUpperCase()}
        </Animated.Text>
      </View>
      {isTop && memberTier ? (
        <>
          <Animated.Text testID="splash-tier" style={[styles.cardTier, { color: '#101520' }]}>
            {memberTier.toUpperCase()}
          </Animated.Text>
          <Animated.Text
            testID="splash-masked-number"
            style={[styles.cardNumber, { fontFamily: theme.fontFamily.display }]}
          >
            •••• ••••
          </Animated.Text>
        </>
      ) : null}
    </Animated.View>
  );

  return (
    <View style={StyleSheet.absoluteFill} testID="splash-variant-collection">
      <Animated.View
        style={[
          styles.bloom,
          {
            backgroundColor: gold,
            opacity: sampleRange(progress, (t) => collectionFrame(t).bloomOpacity * 0.2, T),
          },
        ]}
      />
      {card('card1', { backgroundColor: '#141824', borderColor: 'rgba(255,255,255,0.12)' }, false)}
      {card('card2', { backgroundColor: '#171c2a', borderColor: 'rgba(255,255,255,0.16)' }, false)}
      {card('card3', { backgroundColor: '#ECEDF1', borderColor: 'rgba(255,255,255,0.5)' }, true)}
      <SplashWordmark
        progress={progress}
        T={T}
        brandName={brandName}
        tagline={tagline}
        frame={(t) => collectionFrame(t).wordmark}
        topPct={62}
      />
    </View>
  );
}

function circle(size: number) {
  return {
    position: 'absolute' as const,
    width: size,
    height: size,
    borderRadius: size / 2,
    left: '50%' as const,
    top: '50%' as const,
    marginLeft: -size / 2,
    marginTop: -size / 2,
  };
}

const styles = StyleSheet.create({
  bloom: {
    position: 'absolute',
    left: '-15%',
    right: '-15%',
    top: '20%',
    height: '55%',
    borderRadius: 999,
  },
  ribbon: { position: 'absolute', left: '-45%', width: '190%', borderRadius: 999 },
  centered: {},
  ring: {
    borderWidth: 1.5,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  frame: { borderWidth: 1 },
  card: {
    position: 'absolute',
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  cardEmblem: { position: 'absolute', top: '9%', left: '7%' },
  cardEmblemText: { fontSize: 18, opacity: 0.6 },
  cardTier: {
    position: 'absolute',
    bottom: '10%',
    left: '7%',
    fontSize: 10,
    letterSpacing: 2.4,
    fontWeight: '700',
  },
  cardNumber: {
    position: 'absolute',
    bottom: '10%',
    right: '7%',
    fontSize: 11,
    letterSpacing: 1.5,
    color: '#3a4356',
  },
});
