import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '../theme/ThemeProvider';

export interface ProgressRingProps {
  /** Fill fraction, 0–1. */
  ratio: number;
  size?: number;
  strokeWidth?: number;
  /** Centered content (e.g. points in Playfair + a caps label). */
  children?: React.ReactNode;
}

/**
 * Circular progress ring (RS5) — a ghost track with an indigo progress arc, used for tier status.
 * Token-driven; the arc is the obsidian accent. Content is centered inside the ring.
 */
export function ProgressRing({
  ratio,
  size = 176,
  strokeWidth = 8,
  children,
}: ProgressRingProps): React.JSX.Element {
  const theme = useTheme();
  const c = theme.colors;
  const clamped = Math.max(0, Math.min(1, ratio));
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const center = size / 2;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={r}
          stroke={c.border.ghost ?? c.border.strong}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={r}
          stroke={c.brand.accent}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
