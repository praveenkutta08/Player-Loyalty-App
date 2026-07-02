import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Gift, Home, Menu, ScanLine, User } from 'lucide-react-native';

import { AccountScreen } from '../../features/account/AccountScreen';
import { HomeScreen } from '../../features/home/HomeScreen';
import { MoreScreen } from '../../features/more/MoreScreen';
import { OffersScreen } from '../../features/offers/OffersScreen';
import { PlayScreen } from '../../features/wallet/PlayScreen';
import { buildConfig } from '../../config/buildConfig';
import { useTheme } from '../../theme/ThemeProvider';
import { TopBar } from './TopBar';

import type { MainTabParamList } from './types';
import type { LucideIcon } from 'lucide-react-native';

const Tab = createBottomTabNavigator<MainTabParamList>();

const ICONS: Record<keyof MainTabParamList, LucideIcon> = {
  Home,
  Offers: Gift,
  Play: ScanLine,
  Account: User,
  More: Menu,
};

/**
 * Bottom tab shell (G1) — Option B: Home · Offers · center Scan/Play · Account · More. Static here;
 * P4.14 makes the tab set, labels, and center action fully manifest-`navigation`-driven.
 */
export function MainTabs(): React.JSX.Element {
  const theme = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        header: () => <TopBar title={buildConfig.appName} />,
        tabBarActiveTintColor: theme.colors.brand.gold,
        tabBarInactiveTintColor: theme.colors.text.muted,
        tabBarStyle: {
          backgroundColor: theme.colors.bg.base,
          borderTopColor: theme.colors.border.soft,
        },
        tabBarLabelStyle: { fontFamily: theme.fontFamily.sans, fontSize: 10 },
        tabBarIcon: ({ color, size, focused }) => {
          const Icon = ICONS[route.name];
          // The center Scan/Play action is emphasized (filled gold circle) per Option B.
          if (route.name === 'Play') {
            return (
              <ScanLine
                color={focused ? theme.colors.brand.onGold : theme.colors.brand.onGold}
                size={size}
              />
            );
          }
          return <Icon color={color} size={size} />;
        },
        tabBarItemStyle: route.name === 'Play' ? styleCenterItem(theme.colors.brand.gold) : undefined,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Offers" component={OffersScreen} />
      <Tab.Screen name="Play" component={PlayScreen} options={{ tabBarLabel: 'Scan/Play' }} />
      <Tab.Screen name="Account" component={AccountScreen} />
      <Tab.Screen name="More" component={MoreScreen} />
    </Tab.Navigator>
  );
}

/** Center action styling: a gold pill drawing the eye to Scan/Play. */
function styleCenterItem(gold: string) {
  return {
    backgroundColor: gold,
    borderRadius: 16,
    marginHorizontal: 6,
    marginVertical: 6,
  } as const;
}
