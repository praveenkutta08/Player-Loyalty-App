import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { useTheme } from '../../theme/ThemeProvider';
import { DigitalKeyScreen } from '../digitalkey/DigitalKeyScreen';
import { ReservationBookScreen } from '../reservations/ReservationBookScreen';
import { ReservationDetailScreen } from '../reservations/ReservationDetailScreen';
import { ReservationsListScreen } from '../reservations/ReservationsListScreen';
import { ValetScreen } from '../reservations/ValetScreen';
import { ThemeSettingsScreen } from '../settings/ThemeSettingsScreen';

import { MoreHomeScreen } from './MoreHomeScreen';

import type { MoreStackParamList } from './types';

const Stack = createNativeStackNavigator<MoreStackParamList>();

/**
 * More tab stack: the menu hub (M1) plus concierge/service screens. The hub itself hides the
 * TopBar-duplicating header; detail screens carry titles. P4.14 makes the menu fully manifest-driven
 * and adds support chat.
 */
export function MoreNavigator(): React.JSX.Element {
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
      <Stack.Screen name="MoreHome" component={MoreHomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Appearance" component={ThemeSettingsScreen} options={{ title: 'Appearance' }} />
      <Stack.Screen
        name="Reservations"
        component={ReservationsListScreen}
        options={{ title: 'Reservations' }}
      />
      <Stack.Screen
        name="ReservationBook"
        component={ReservationBookScreen}
        options={{ title: 'Book' }}
      />
      <Stack.Screen
        name="ReservationDetail"
        component={ReservationDetailScreen}
        options={{ title: 'Reservation' }}
      />
      <Stack.Screen name="Valet" component={ValetScreen} options={{ title: 'Valet' }} />
      <Stack.Screen name="DigitalKey" component={DigitalKeyScreen} options={{ title: 'Digital key' }} />
    </Stack.Navigator>
  );
}
