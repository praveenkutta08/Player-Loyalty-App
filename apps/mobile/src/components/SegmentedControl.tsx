import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

import { ThemedText } from './ThemedText';

export interface Segment<T extends string> {
  key: T;
  label: string;
}

/** Token-driven segmented control (e.g. Offers | Promotions | My Rewards). */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
}: {
  segments: ReadonlyArray<Segment<T>>;
  value: T;
  onChange: (key: T) => void;
}): React.JSX.Element {
  const theme = useTheme();
  const c = theme.colors;
  return (
    <View
      style={[
        styles.track,
        { backgroundColor: c.bg.elevated, borderColor: c.border.ghost ?? c.border.default },
      ]}
    >
      {segments.map((seg) => {
        const active = seg.key === value;
        return (
          <Pressable
            key={seg.key}
            onPress={() => onChange(seg.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.segment, active && { backgroundColor: c.brand.primary }]}
          >
            <ThemedText
              variant="label"
              numberOfLines={1}
              style={{ color: active ? c.brand.onPrimary : c.text.muted }}
            >
              {seg.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // Glass pill track; active segment is a filled pearl caps pill (obsidian system, RS4).
  track: {
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    padding: 4,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 999,
  },
});
