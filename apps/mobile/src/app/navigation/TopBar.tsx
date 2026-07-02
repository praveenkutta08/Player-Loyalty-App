import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Bell, Search } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '../../components';
import { useTheme } from '../../theme/ThemeProvider';

export interface TopBarProps {
  /** Brand/tenant title (from the manifest `name` once resolved; build config until then). */
  title: string;
  /** Whether the global notifications bell + search are shown (manifest `globals`). */
  showNotifications?: boolean;
  showSearch?: boolean;
  onPressNotifications?: () => void;
  onPressSearch?: () => void;
}

/** Global top chrome (G1): brand lockup + notifications bell + search, all token-driven. */
export function TopBar({
  title,
  showNotifications = true,
  showSearch = true,
  onPressNotifications,
  onPressSearch,
}: TopBarProps): React.JSX.Element {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.bar,
        {
          paddingTop: insets.top + theme.spacing.sm,
          paddingHorizontal: theme.spacing.lg,
          backgroundColor: theme.colors.bg.base,
          borderBottomColor: theme.colors.border.soft,
        },
      ]}
    >
      <ThemedText variant="h2" numberOfLines={1} style={styles.title}>
        {title}
      </ThemedText>
      <View style={styles.actions}>
        {showSearch ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Search"
            hitSlop={8}
            onPress={onPressSearch}
            style={styles.action}
          >
            <Search size={20} color={theme.colors.text.secondary} />
          </Pressable>
        ) : null}
        {showNotifications ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            hitSlop={8}
            onPress={onPressNotifications}
            style={styles.action}
          >
            <Bell size={20} color={theme.colors.text.secondary} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { flex: 1 },
  actions: { flexDirection: 'row', alignItems: 'center' },
  action: { marginLeft: 18 },
});
