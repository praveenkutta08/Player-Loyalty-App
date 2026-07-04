import React from 'react';

import { ThemedText } from './ThemedText';

import type { ThemedTextProps } from './ThemedText';

/**
 * `CATEGORY` micro-label — the uppercase, wide-tracked caption that anchors immersive cards and
 * section headers in the obsidian system (`kicker` scale step: 10.5px, +0.16em, uppercase).
 */
export function Kicker({
  color = 'secondary',
  ...rest
}: Omit<ThemedTextProps, 'variant'>): React.JSX.Element {
  return <ThemedText variant="kicker" color={color} {...rest} />;
}

/**
 * UPPERCASE tracked label (`label` scale step: 12px, +0.1em) — used for CAPS section titles like
 * "CURRENT BALANCE" / "RECENT TRANSACTIONS".
 */
export function CapsLabel({
  color = 'secondary',
  ...rest
}: Omit<ThemedTextProps, 'variant'>): React.JSX.Element {
  return <ThemedText variant="label" color={color} {...rest} />;
}
