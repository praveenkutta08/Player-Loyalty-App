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
  return (
    <View
      style={[
        styles.track,
        { backgroundColor: theme.colors.bg.surface, borderColor: theme.colors.border.default },
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
            style={[
              styles.segment,
              active && {
                backgroundColor: theme.colors.brand.gold,
                borderRadius: theme.radius.control,
              },
            ]}
          >
            <ThemedText
              variant="label"
              style={{ color: active ? theme.colors.brand.onGold : theme.colors.text.muted }}
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
  track: {
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 3,
  },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
});
