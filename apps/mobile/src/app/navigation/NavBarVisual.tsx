import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '../../components';
import { useTheme } from '../../theme/ThemeProvider';

import {
  EDITORIAL,
  editorialBottomPadding,
  FLOATING_PILL,
  pillBottomOffset,
  type NavStyleKey,
} from './navStyles';

import type { ResolvedTab } from './navConfig';

export interface NavBarVisualProps {
  styleKey: NavStyleKey;
  tabs: ResolvedTab[];
  activeRoute: string;
  onPress: (route: string) => void;
  safeAreaBottom: number;
}

/**
 * The presentational bar (P7.4) — pure function of (style, tabs, active route, insets), shared
 * by the real navigator's tabBar and the dev gallery. Rendering-only: the Option B structure,
 * center action and its cashless fallback are decided upstream in resolveTabs (P4.14).
 */
export function NavBarVisual({
  styleKey,
  tabs,
  activeRoute,
  onPress,
  safeAreaBottom,
}: NavBarVisualProps): React.JSX.Element {
  const theme = useTheme();
  const floating = styleKey === 'floatingPill';
  const gold = theme.colors.brand.gold;
  const muted = theme.colors.text.muted;

  const items = tabs.map(({ route, label, icon: Icon, isCenter }) => {
    const active = route === activeRoute;
    const tint = active ? gold : muted;

    if (isCenter) {
      const size = floating ? FLOATING_PILL.centerSize : EDITORIAL.centerBadgeSize;
      return (
        <Pressable
          key={route}
          accessibilityRole="button"
          accessibilityLabel={label}
          testID={`nav-${route}`}
          onPress={() => onPress(route)}
          style={styles.item}
        >
          <View
            testID="nav-center-badge"
            style={[
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: gold,
                alignItems: 'center',
                justifyContent: 'center',
              },
              floating
                ? {
                    marginTop: -FLOATING_PILL.centerRaise,
                    shadowColor: gold, // primary-color-only glow (splash language)
                    shadowOpacity: 0.45,
                    shadowRadius: 12,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 8,
                  }
                : null,
            ]}
          >
            <Icon size={floating ? 24 : EDITORIAL.iconSize} color={theme.colors.brand.onGold} />
          </View>
          {!floating ? (
            <ThemedText variant="label" style={[styles.editorialLabel, { color: gold }]}>
              {label}
            </ThemedText>
          ) : null}
        </Pressable>
      );
    }

    return (
      <Pressable
        key={route}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: active }}
        testID={`nav-${route}`}
        onPress={() => onPress(route)}
        style={styles.item}
      >
        <Icon size={floating ? FLOATING_PILL.iconSize : EDITORIAL.iconSize} color={tint} />
        {floating ? (
          <View style={[styles.pillDot, { backgroundColor: active ? gold : 'transparent' }]} />
        ) : (
          <ThemedText
            variant="label"
            style={[styles.editorialLabel, { color: tint, fontWeight: active ? '600' : '400' }]}
          >
            {label}
          </ThemedText>
        )}
      </Pressable>
    );
  });

  if (floating) {
    return (
      <View
        testID="navbar-floatingPill"
        pointerEvents="box-none"
        style={[styles.pillWrap, { bottom: pillBottomOffset(safeAreaBottom) }]}
      >
        <View
          style={[
            styles.pill,
            {
              borderColor: theme.colors.border.soft,
              // iOS: translucent stand-in for native blur; Android: translucent solid (spec).
              backgroundColor:
                Platform.OS === 'ios' ? `${theme.colors.bg.elevated}EB` : theme.colors.bg.elevated,
            },
          ]}
        >
          {items}
        </View>
      </View>
    );
  }

  return (
    <View
      testID="navbar-editorial"
      style={[
        styles.editorialBar,
        {
          backgroundColor: theme.colors.bg.base,
          borderTopColor: theme.colors.border.soft,
          paddingBottom: editorialBottomPadding(safeAreaBottom),
        },
      ]}
    >
      {items}
    </View>
  );
}

const styles = StyleSheet.create({
  editorialBar: {
    flexDirection: 'row',
    height: EDITORIAL.barHeight, // + safe-area paddingBottom
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'stretch',
  },
  pillWrap: {
    position: 'absolute',
    left: FLOATING_PILL.horizontalMargin,
    right: FLOATING_PILL.horizontalMargin,
  },
  pill: {
    flexDirection: 'row',
    height: FLOATING_PILL.barHeight,
    borderRadius: FLOATING_PILL.radius,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'stretch',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: EDITORIAL.labelGap },
  editorialLabel: { fontSize: EDITORIAL.labelSize, letterSpacing: 0.4 },
  pillDot: {
    width: FLOATING_PILL.activeDotSize,
    height: FLOATING_PILL.activeDotSize,
    borderRadius: FLOATING_PILL.activeDotSize / 2,
    marginTop: 4,
  },
});
