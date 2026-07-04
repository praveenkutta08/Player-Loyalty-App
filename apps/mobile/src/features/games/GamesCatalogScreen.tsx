import { Search, Trophy } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  GlassCard,
  ImmersiveCard,
  Input,
  PillButton,
  Screen,
  SegmentedControl,
  ThemedText,
} from '../../components';
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
          <View style={styles.jackpot}>
            <ImmersiveCard
              kicker="Jackpot of the Day"
              title={jackpot.title}
              subtitle={
                jackpot.jackpot_amount_cents != null
                  ? formatMoney(jackpot.jackpot_amount_cents)
                  : undefined
              }
              height={220}
              actions={
                <PillButton
                  label="Play now"
                  variant="accent"
                  onPress={() => navigation.navigate('GameDetail', { game: jackpot })}
                  testID="jackpot-play"
                />
              }
            />
          </View>
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

        <View style={styles.leaderboardBtn}>
          <PillButton
            label="View leaderboard"
            variant="secondary"
            block
            icon={<Trophy size={16} color={theme.colors.text.primary} />}
            onPress={() => navigation.navigate('Leaderboard')}
          />
        </View>

        {(games.data ?? []).length === 0 ? (
          <ThemedText variant="body" color="muted" style={styles.empty}>
            {games.isFetching ? 'Loading…' : 'No games match your search.'}
          </ThemedText>
        ) : (
          <GlassCard bare style={styles.list}>
            {(games.data ?? []).map((g) => (
              <GameTile
                key={g.id}
                game={g}
                onPress={() => navigation.navigate('GameDetail', { game: g })}
              />
            ))}
          </GlassCard>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 16, paddingBottom: 32 },
  jackpot: { marginBottom: 24 },
  search: { marginBottom: 4 },
  searchHint: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  searchHintText: { marginLeft: 6 },
  filter: { marginBottom: 12 },
  leaderboardBtn: { marginBottom: 16 },
  list: {},
  empty: { paddingVertical: 16 },
});
