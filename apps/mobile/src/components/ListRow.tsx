import { ChevronRight } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

import { ThemedText } from './ThemedText';

/** A tappable settings/menu row: leading icon, title (+ optional subtitle), trailing chevron/value. */
export function ListRow({
  icon,
  title,
  subtitle,
  value,
  onPress,
  showChevron = true,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
}): React.JSX.Element {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[styles.row, { borderBottomColor: theme.colors.border.soft }]}
    >
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <View style={styles.body}>
        <ThemedText variant="title">{title}</ThemedText>
        {subtitle ? (
          <ThemedText variant="body" color="muted">
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {value ? (
        <ThemedText variant="body" color="secondary" style={styles.value}>
          {value}
        </ThemedText>
      ) : null}
      {showChevron && onPress ? <ChevronRight size={18} color={theme.colors.text.muted} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  icon: { width: 28, alignItems: 'center', marginRight: 12 },
  body: { flex: 1 },
  value: { marginRight: 8 },
});
