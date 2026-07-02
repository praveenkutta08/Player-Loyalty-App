import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { useTheme } from '../../theme/ThemeProvider';

import { GameDetailScreen } from './GameDetailScreen';
import { GamesCatalogScreen } from './GamesCatalogScreen';
import { LeaderboardScreen } from './LeaderboardScreen';

import type { GamesStackParamList } from './types';

const Stack = createNativeStackNavigator<GamesStackParamList>();

/** Gaming stack (under More): catalog (C8) → detail (C9) + leaderboard (C5). */
export function GamesNavigator(): React.JSX.Element {
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
      <Stack.Screen name="GamesCatalog" component={GamesCatalogScreen} options={{ title: 'Games' }} />
      <Stack.Screen name="GameDetail" component={GameDetailScreen} options={{ title: 'Game' }} />
      <Stack.Screen name="Leaderboard" component={LeaderboardScreen} options={{ title: 'Leaderboard' }} />
    </Stack.Navigator>
  );
}
