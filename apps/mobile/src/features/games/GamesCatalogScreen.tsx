import { Search, Trophy } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button, Card, Input, Screen, SegmentedControl, ThemedText } from '../../components';
import { useTheme } from '../../theme/ThemeProvider';
import { formatMoney } from '../wallet/money';

import { useGetGamesQuery, useGetJackpotGamesQuery } from './gamesApi';
import { GameTile } from './GameTile';

import type { CatalogFilter, GameCategory } from './gamesApi';
import type { GamesStackParamList } from './types';
import type { Segment } from '../../components';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<GamesStackParamList, 'GamesCatalog'>;

const FILTERS: Segment<CatalogFilter>[] = [
  { key: 'all', label: 'All' },
  { key: 'slots', label: 'Slots' },
  { key: 'tables', label: 'Tables' },
];

/** C8 — Games catalog: jackpot feature, search, All/Slots/Tables filter, and the game list. */
export function GamesCatalogScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme();
  const [filter, setFilter] = useState<CatalogFilter>('all');
  const [query, setQuery] = useState('');

  const category = filter === 'all' ? undefined : (filter as GameCategory);
  const games = useGetGamesQuery({ category, q: query.trim() || undefined });
  const jackpots = useGetJackpotGamesQuery();
  const jackpot = jackpots.data?.[0];

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {jackpot ? (
          <Card style={[styles.jackpot, { backgroundColor: theme.colors.brand.gold }]}>
            <View style={styles.jackpotHead}>
              <Trophy size={20} color={theme.colors.brand.onGold} />
              <ThemedText
                variant="kicker"
                style={[styles.jackpotKicker, { color: theme.colors.brand.onGold }]}
              >
                Jackpot of the day
              </ThemedText>
            </View>
            <ThemedText variant="h2" style={{ color: theme.colors.brand.onGold }}>
              {jackpot.title}
            </ThemedText>
            {jackpot.jackpot_amount_cents != null ? (
              <ThemedText variant="display" style={{ color: theme.colors.brand.onGold }}>
                {formatMoney(jackpot.jackpot_amount_cents)}
              </ThemedText>
            ) : null}
            <Button
              label="Play now"
              variant="secondary"
              style={styles.playNow}
              onPress={() => navigation.navigate('GameDetail', { game: jackpot })}
              testID="jackpot-play"
            />
          </Card>
        ) : null}

        <Input
          placeholder="Search games"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          containerStyle={styles.search}
          // Search icon rendered inline via label-less field; keep it simple/token-driven.
        />
        <View style={styles.searchHint}>
          <Search size={14} color={theme.colors.text.muted} />
          <ThemedText variant="label" color="muted" style={styles.searchHintText}>
            Search by title
          </ThemedText>
        </View>

        <View style={styles.filter}>
          <SegmentedControl segments={FILTERS} value={filter} onChange={setFilter} />
        </View>

        <Button
          label="View leaderboard"
          variant="secondary"
          icon={<Trophy size={16} color={theme.colors.text.primary} />}
          style={styles.leaderboardBtn}
          onPress={() => navigation.navigate('Leaderboard')}
        />

        <Card style={styles.list}>
          {(games.data ?? []).length === 0 ? (
            <ThemedText variant="body" color="muted">
              {games.isFetching ? 'Loading…' : 'No games match your search.'}
            </ThemedText>
          ) : (
            (games.data ?? []).map((g) => (
              <GameTile
                key={g.id}
                game={g}
                onPress={() => navigation.navigate('GameDetail', { game: g })}
              />
            ))
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 16, paddingBottom: 32 },
  jackpot: { marginBottom: 16 },
  jackpotHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  jackpotKicker: { marginLeft: 8 },
  playNow: { marginTop: 16, alignSelf: 'flex-start' },
  search: { marginBottom: 4 },
  searchHint: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  searchHintText: { marginLeft: 6 },
  filter: { marginBottom: 12 },
  leaderboardBtn: { marginBottom: 16 },
  list: {},
});
