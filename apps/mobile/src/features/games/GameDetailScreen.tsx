import { Dices, Play, Trophy } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { navigateToScanPlay } from '../../app/navigation/navigationRef';
import { useAppDispatch, useAppSelector } from '../../app/store';
import { Button, Card, Screen, StatusPill, ThemedText } from '../../components';
import { useTheme } from '../../theme/ThemeProvider';
import { formatMoney } from '../wallet/money';

import { isFavorite, setFavorite } from './favoritesSlice';
import { useFavoriteGameMutation, useUnfavoriteGameMutation } from './gamesApi';
import { volatility } from './GameTile';

import type { GamesStackParamList } from './types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<GamesStackParamList, 'GameDetail'>;

/** C9 — Game detail: info + favorite, and Play routes to Scan/Play (cardless pairing, P4.6). */
export function GameDetailScreen({ route }: Props): React.JSX.Element {
  const theme = useTheme();
  const { game } = route.params;
  const dispatch = useAppDispatch();
  const favorited = useAppSelector((s) => isFavorite(s.gameFavorites, game.id));
  const [favorite] = useFavoriteGameMutation();
  const [unfavorite] = useUnfavoriteGameMutation();
  const vol = volatility(game.volatility);

  function toggleFav(): void {
    const next = !favorited;
    dispatch(setFavorite({ id: game.id, favorite: next }));
    if (next) void favorite(game.id);
    else void unfavorite(game.id);
  }

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={[styles.hero, { backgroundColor: theme.colors.bg.surface }]}>
          <Dices size={44} color={theme.colors.text.muted} />
        </View>
        <ThemedText variant="h1">{game.title}</ThemedText>
        {game.provider ? (
          <ThemedText variant="body" color="muted">
            {game.provider}
          </ThemedText>
        ) : null}

        <View style={styles.badges}>
          <StatusPill label={game.category} tone="info" />
          {vol ? <StatusPill label={vol.label} tone={vol.tone} /> : null}
          {game.is_jackpot ? <StatusPill label="Jackpot" tone="warning" /> : null}
        </View>

        {game.is_jackpot && game.jackpot_amount_cents != null ? (
          <Card style={styles.jackpot}>
            <View style={styles.jackpotHead}>
              <Trophy size={18} color={theme.colors.brand.gold} />
              <ThemedText variant="label" color="muted" style={styles.jackpotLabel}>
                Current jackpot
              </ThemedText>
            </View>
            <ThemedText variant="h2">{formatMoney(game.jackpot_amount_cents)}</ThemedText>
          </Card>
        ) : null}

        <Button
          label="Play"
          icon={<Play size={18} color={theme.colors.brand.onGold} />}
          style={styles.play}
          onPress={navigateToScanPlay}
          testID="game-play"
        />
        <Button
          label={favorited ? 'Remove from favorites' : 'Add to favorites'}
          variant="secondary"
          style={styles.fav}
          onPress={toggleFav}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 16, paddingBottom: 32 },
  hero: {
    height: 160,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  jackpot: { marginTop: 16 },
  jackpotHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  jackpotLabel: { marginLeft: 8 },
  play: { marginTop: 20 },
  fav: { marginTop: 10 },
});
