import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';

import { buildConfig } from '../../config/buildConfig';
import { useTheme } from '../../theme/ThemeProvider';
import { useManifest } from '../manifest/ManifestProvider';
import { useFeatures } from '../providers/FeatureProvider';

import { resolveTabs } from './navConfig';
import { navigationRef } from './navigationRef';
import { TopBar } from './TopBar';

import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

/**
 * Bottom tab shell (G1) — config-driven (P4.14). The tab set, labels (localized in the manifest),
 * icons, per-tab feature gating, and the emphasized center action all come from the manifest
 * `navigation` block (falling back to Option B when absent). Globals toggle the TopBar bell/search.
 */
export function MainTabs(): React.JSX.Element {
  const theme = useTheme();
  const { manifest } = useManifest();
  const { isEnabled } = useFeatures();
  const title = manifest?.name ?? buildConfig.appName;
  const globals = manifest?.navigation?.globals;
  const tabs = resolveTabs(manifest?.navigation, isEnabled);

  return (
    <Tab.Navigator
      screenOptions={{
        header: () => (
          <TopBar
            title={title}
            showNotifications={globals?.showNotifications !== false}
            showSearch={globals?.showSearch !== false}
            onPressNotifications={() => navigationRef.navigate('Notifications')}
          />
        ),
        tabBarActiveTintColor: theme.colors.brand.gold,
        tabBarInactiveTintColor: theme.colors.text.muted,
        tabBarStyle: {
          backgroundColor: theme.colors.bg.base,
          borderTopColor: theme.colors.border.soft,
        },
        tabBarLabelStyle: { fontFamily: theme.fontFamily.sans, fontSize: 10 },
      }}
    >
      {tabs.map(({ route, label, icon: Icon, component, isCenter }) => (
        <Tab.Screen
          key={route}
          name={route}
          component={component}
          options={{
            tabBarLabel: label,
            // The center action (Option B: Scan/Play) is emphasized with a filled gold pill.
            tabBarItemStyle: isCenter ? styleCenterItem(theme.colors.brand.gold) : undefined,
            tabBarIcon: ({ color, size }) => (
              <Icon color={isCenter ? theme.colors.brand.onGold : color} size={size} />
            ),
          }}
        />
      ))}
    </Tab.Navigator>
  );
}

/** Center action styling: a gold pill drawing the eye to the primary action. */
function styleCenterItem(gold: string) {
  return {
    backgroundColor: gold,
    borderRadius: 16,
    marginHorizontal: 6,
    marginVertical: 6,
  } as const;
}
