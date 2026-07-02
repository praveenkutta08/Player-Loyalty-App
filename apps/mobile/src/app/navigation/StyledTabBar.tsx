import React, { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NavBarVisual } from './NavBarVisual';

import type { ResolvedTab } from './navConfig';
import type { NavStyleKey } from './navStyles';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

/**
 * Bridge from React Navigation's tabBar contract to the presentational NavBarVisual (P7.4).
 * Deep links and tab state are untouched — presses emit the standard tabPress event and
 * navigate exactly like the default bar; the keyboard hides the bar on both platforms.
 */
export function StyledTabBar({
  state,
  navigation,
  styleKey,
  tabs,
}: BottomTabBarProps & { styleKey: NavStyleKey; tabs: ResolvedTab[] }): React.JSX.Element | null {
  const insets = useSafeAreaInsets();
  const [keyboardShown, setKeyboardShown] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardShown(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardShown(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  if (keyboardShown) return null;

  const activeRoute = state.routes[state.index]?.name ?? tabs[0]?.route ?? 'Home';

  const onPress = (route: string): void => {
    const target = state.routes.find((r) => r.name === route);
    const event = navigation.emit({
      type: 'tabPress',
      target: target?.key,
      canPreventDefault: true,
    });
    if (!event.defaultPrevented) {
      navigation.navigate(route as never);
    }
  };

  return (
    <NavBarVisual
      styleKey={styleKey}
      tabs={tabs}
      activeRoute={activeRoute}
      onPress={onPress}
      safeAreaBottom={insets.bottom}
    />
  );
}
