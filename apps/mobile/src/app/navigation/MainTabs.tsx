import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';

import { buildConfig } from '../../config/buildConfig';
import { useManifest } from '../manifest/ManifestProvider';
import { useFeatures } from '../providers/FeatureProvider';

import { resolveTabs } from './navConfig';
import { navigationRef } from './navigationRef';
import { resolveNavStyle } from './navStyles';
import { StyledTabBar } from './StyledTabBar';
import { TopBar } from './TopBar';

import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

/**
 * Bottom tab shell (G1) — config-driven (P4.14). The tab set, labels (localized in the manifest),
 * icons, per-tab feature gating, and the emphasized center action all come from the manifest
 * `navigation` block (falling back to Option B when absent). Globals toggle the TopBar bell/search.
 * P7.4: `navigation.style` (floatingPill | editorial) skins the bar — visuals only; structure,
 * the resolveTabs-enforced center-action fallback + min-tab safety (M15), deep links and tab
 * state are identical in both styles.
 */
export function MainTabs(): React.JSX.Element {
  const { manifest } = useManifest();
  const { isEnabled } = useFeatures();
  const title = manifest?.name ?? buildConfig.appName;
  const globals = manifest?.navigation?.globals;
  const tabs = resolveTabs(manifest?.navigation, isEnabled);
  const navStyle = resolveNavStyle(manifest?.navigation?.style);
  const conciergeOn = isEnabled('concierge');

  return (
    <Tab.Navigator
      tabBar={(props) => <StyledTabBar {...props} styleKey={navStyle} tabs={tabs} />}
      screenOptions={{
        header: () => (
          <TopBar
            title={title}
            showNotifications={globals?.showNotifications !== false}
            showSearch={globals?.showSearch !== false}
            showAsk={conciergeOn}
            onPressNotifications={() => navigationRef.navigate('Notifications')}
            onPressAsk={() => navigationRef.navigate('AskAI')}
          />
        ),
      }}
    >
      {tabs.map(({ route, label, component }) => (
        <Tab.Screen key={route} name={route} component={component} options={{ title: label }} />
      ))}
    </Tab.Navigator>
  );
}
