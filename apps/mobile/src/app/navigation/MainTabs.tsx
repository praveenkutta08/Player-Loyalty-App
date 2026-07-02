import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Gift, Home, Menu, ScanLine, User } from 'lucide-react-native';
import React from 'react';

import { buildConfig } from '../../config/buildConfig';
import { AccountNavigator } from '../../features/account/AccountNavigator';
import { HomeScreen } from '../../features/home/HomeScreen';
import { MoreNavigator } from '../../features/more/MoreNavigator';
import { OffersNavigator } from '../../features/offers/OffersNavigator';
import { WalletNavigator } from '../../features/wallet/WalletNavigator';
import { useTheme } from '../../theme/ThemeProvider';
import { useManifest } from '../manifest/ManifestProvider';

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
  const { manifest } = useManifest();
  const title = manifest?.name ?? buildConfig.appName;
  const globals = manifest?.navigation?.globals;
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        header: () => (
          <TopBar
            title={title}
            showNotifications={globals?.showNotifications !== false}
            showSearch={globals?.showSearch !== false}
          />
        ),
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
      <Tab.Screen name="Offers" component={OffersNavigator} />
      <Tab.Screen name="Play" component={WalletNavigator} options={{ tabBarLabel: 'Scan/Play' }} />
      <Tab.Screen name="Account" component={AccountNavigator} />
      <Tab.Screen name="More" component={MoreNavigator} />
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
