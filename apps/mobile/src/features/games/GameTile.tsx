import { Dices, Heart } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useAppDispatch, useAppSelector } from '../../app/store';
import { StatusPill, ThemedText } from '../../components';
import { useTheme } from '../../theme/ThemeProvider';

import { isFavorite, setFavorite } from './favoritesSlice';
import { useFavoriteGameMutation, useUnfavoriteGameMutation } from './gamesApi';

import type { GameOut } from './gamesApi';
import type { StatusTone } from '../../components';

/** Volatility → label + tone, for the game's risk badge. */
function volatility(v: string | null | undefined): { label: string; tone: StatusTone } | null {
  switch (v) {
    case 'low':
      return { label: 'Low volatility', tone: 'success' };
    case 'medium':
      return { label: 'Medium volatility', tone: 'warning' };
    case 'high':
      return { label: 'High volatility', tone: 'error' };
    default:
      return null;
  }
}

/** A catalog game row: thumbnail, title/provider, volatility badge, and a favorite toggle. */
export function GameTile({ game, onPress }: { game: GameOut; onPress: () => void }): React.JSX.Element {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const favorited = useAppSelector((s) => isFavorite(s.gameFavorites, game.id));
  const [favorite] = useFavoriteGameMutation();
  const [unfavorite] = useUnfavoriteGameMutation();
  const vol = volatility(game.volatility);

  function toggle(): void {
    const next = !favorited;
    dispatch(setFavorite({ id: game.id, favorite: next }));
    // Persist server-side; the local mirror already reflected the change optimistically.
    if (next) void favorite(game.id);
    else void unfavorite(game.id);
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[styles.row, { borderBottomColor: theme.colors.border.soft }]}
    >
      <View style={[styles.thumb, { backgroundColor: theme.colors.bg.surface }]}>
        <Dices size={22} color={theme.colors.text.muted} />
      </View>
      <View style={styles.body}>
        <ThemedText variant="title" numberOfLines={1}>
          {game.title}
        </ThemedText>
        {game.provider ? (
          <ThemedText variant="label" color="muted">
            {game.provider}
          </ThemedText>
        ) : null}
        {vol ? (
          <View style={styles.badge}>
            <StatusPill label={vol.label} tone={vol.tone} />
          </View>
        ) : null}
      </View>
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={favorited ? 'Unfavorite' : 'Favorite'}
        hitSlop={10}
        testID={`fav-${game.id}`}
      >
        <Heart
          size={20}
          color={favorited ? theme.colors.brand.gold : theme.colors.text.muted}
          fill={favorited ? theme.colors.brand.gold : 'transparent'}
        />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  body: { flex: 1 },
  badge: { marginTop: 4 },
});

export { volatility };
