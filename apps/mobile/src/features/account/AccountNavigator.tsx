import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { useTheme } from '../../theme/ThemeProvider';

import { AccountHomeScreen } from './AccountHomeScreen';
import { ActivityScreen } from './ActivityScreen';
import { KycScreen } from './KycScreen';
import { MemberCardScreen } from './MemberCardScreen';
import { ProfileScreen } from './ProfileScreen';
import { ResponsibleGamingScreen } from './ResponsibleGamingScreen';
import { TierBenefitsScreen } from './TierBenefitsScreen';

import type { AccountStackParamList } from './types';

const Stack = createNativeStackNavigator<AccountStackParamList>();

/**
 * Account tab stack (C1 hub → C2/C3/C4/C15 loyalty & profile detail, A9 KYC, M10 responsible
 * gaming). The hub hides its header (custom TopBar from the tab shell); detail screens get a
 * standard themed back-header.
 */
export function AccountNavigator(): React.JSX.Element {
  const theme = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.bg.base },
        headerTintColor: theme.colors.text.primary,
        headerTitleStyle: { fontFamily: theme.fontFamily.sans },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.colors.bg.base },
      }}
    >
      <Stack.Screen
        name="AccountHome"
        component={AccountHomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="MemberCard" component={MemberCardScreen} options={{ title: 'Member Card' }} />
      <Stack.Screen name="TierBenefits" component={TierBenefitsScreen} options={{ title: 'Tier & Benefits' }} />
      <Stack.Screen name="Activity" component={ActivityScreen} options={{ title: 'Activity' }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
      <Stack.Screen name="Kyc" component={KycScreen} options={{ title: 'Verification' }} />
      <Stack.Screen
        name="ResponsibleGaming"
        component={ResponsibleGamingScreen}
        options={{ title: 'Responsible Gaming' }}
      />
    </Stack.Navigator>
  );
}
