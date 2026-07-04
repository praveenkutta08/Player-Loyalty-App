import React from 'react';
import { ImageBackground, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { withAlpha } from '../theme/color';
import { useTheme } from '../theme/ThemeProvider';

import { Kicker } from './Kicker';
import { ThemedText } from './ThemedText';

import type { ImageSourcePropType, StyleProp, ViewStyle } from 'react-native';

export interface ImmersiveCardProps {
  /** Full-bleed background photo. When omitted, a themed obsidian gradient stands in for it. */
  image?: ImageSourcePropType | null;
  /** Playfair title anchored bottom-left. */
  title: string;
  /** Uppercase category kicker above the title (e.g. "LIMITED TIME"). */
  kicker?: string;
  /** Optional supporting line under the title. */
  subtitle?: string;
  /** CTA row (PillButtons) rendered under the title. */
  actions?: React.ReactNode;
  onPress?: () => void;
  /** Card height. Defaults to 240. */
  height?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Immersive card (DESIGN.md → Components): a full-bleed architectural photo under a bottom gradient
 * scrim, with a Playfair title anchored bottom-left over a `CATEGORY` kicker and an optional CTA
 * row. The scrim keeps the title legible over any photo. Radius = `image` (24). No hardcoded color —
 * the scrim is derived from the obsidian void token.
 */
export function ImmersiveCard({
  image,
  title,
  kicker,
  subtitle,
  actions,
  onPress,
  height = 240,
  style,
  testID,
}: ImmersiveCardProps): React.JSX.Element {
  const theme = useTheme();
  const c = theme.colors;
  const r = theme.radius.image ?? theme.radius.card;
  const voidColor = c.bg.base;

  const overlay = (
    <>
      {/* Bottom-weighted scrim so the Playfair title reads over any photo; with no photo the same
          gradient (plus a faint indigo cast) becomes the card's obsidian backdrop. */}
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <LinearGradient id="immersiveScrim" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={image ? withAlpha(voidColor, 0) : c.bg.surface} />
            <Stop
              offset="0.45"
              stopColor={image ? withAlpha(voidColor, 0) : withAlpha(c.bg.surface, 0.4)}
            />
            <Stop offset="1" stopColor={image ? withAlpha(voidColor, 0.85) : voidColor} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#immersiveScrim)" />
      </Svg>

      <View style={[styles.content, { padding: theme.spacing.lg }]}>
        {kicker ? <Kicker color="secondary">{kicker}</Kicker> : null}
        <ThemedText variant="h1" style={{ marginTop: theme.spacing.xs }}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText variant="bodySm" color="secondary" style={{ marginTop: theme.spacing.xs }}>
            {subtitle}
          </ThemedText>
        ) : null}
        {actions ? <View style={{ marginTop: theme.spacing.md }}>{actions}</View> : null}
      </View>
    </>
  );

  return (
    <View
      testID={testID}
      onTouchEnd={onPress}
      style={[
        {
          height,
          borderRadius: r,
          overflow: 'hidden',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: c.border.ghost ?? c.border.soft,
        },
        style,
      ]}
    >
      {image ? (
        <ImageBackground source={image} style={StyleSheet.absoluteFill} resizeMode="cover">
          {overlay}
        </ImageBackground>
      ) : (
        overlay
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'flex-end' },
});
