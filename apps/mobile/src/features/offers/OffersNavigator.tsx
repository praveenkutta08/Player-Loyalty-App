import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { useTheme } from '../../theme/ThemeProvider';
import { RewardDetailScreen } from '../rewards/RewardDetailScreen';
import { RewardsMarketplaceScreen } from '../rewards/RewardsMarketplaceScreen';

import { OfferDetailScreen } from './OfferDetailScreen';
import { OffersScreen } from './OffersScreen';
import { PromotionDetailScreen } from './PromotionDetailScreen';
import { RedemptionConfirmationScreen } from './RedemptionConfirmationScreen';

import type { OffersStackParamList } from './types';

const Stack = createNativeStackNavigator<OffersStackParamList>();

/** Offers tab stack: list (O1/O3) → offer detail (O2) / promotion detail (O4) → confirmation (O6). */
export function OffersNavigator(): React.JSX.Element {
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
      <Stack.Screen name="OffersHome" component={OffersScreen} options={{ headerShown: false }} />
      <Stack.Screen name="OfferDetail" component={OfferDetailScreen} options={{ title: 'Offer' }} />
      <Stack.Screen
        name="PromotionDetail"
        component={PromotionDetailScreen}
        options={{ title: 'Promotion' }}
      />
      <Stack.Screen
        name="RedemptionConfirmation"
        component={RedemptionConfirmationScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="RewardsMarketplace"
        component={RewardsMarketplaceScreen}
        options={{ title: 'Rewards' }}
      />
      <Stack.Screen
        name="RewardDetail"
        component={RewardDetailScreen}
        options={{ title: 'Reward' }}
      />
    </Stack.Navigator>
  );
}
