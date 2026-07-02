import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { Card, Screen, ThemedText } from '../../components';
import { useTheme } from '../../theme/ThemeProvider';

import { useGetLeaderboardQuery } from './gamesApi';

import type { LeaderboardOut } from './gamesApi';

type Entry = LeaderboardOut['entries'][number];

/** C5 — Leaderboard: top ranks + the player's own position. */
export function LeaderboardScreen(): React.JSX.Element {
  const q = useGetLeaderboardQuery();
  const entries = q.data?.entries ?? [];
  const me = q.data?.me ?? null;

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={q.isFetching} onRefresh={() => void q.refetch()} />
        }
      >
        {me ? (
          <Card style={styles.meCard}>
            <ThemedText variant="label" color="muted">
              Your rank
            </ThemedText>
            <View style={styles.meRow}>
              <ThemedText variant="display">#{me.rank}</ThemedText>
              <ThemedText variant="title">{me.points.toLocaleString()} pts</ThemedText>
            </View>
          </Card>
        ) : null}

        <Card>
          {entries.length === 0 ? (
            <ThemedText variant="body" color="muted">
              {q.isFetching ? 'Loading…' : 'No ranked players yet.'}
            </ThemedText>
          ) : (
            entries.map((e) => (
              <Row key={e.player_id} entry={e} isMe={me?.player_id === e.player_id} />
            ))
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}

function Row({ entry, isMe }: { entry: Entry; isMe: boolean }): React.JSX.Element {
  const theme = useTheme();
  return (
    <View style={[styles.row, { borderBottomColor: theme.colors.border.soft }]}>
      <ThemedText variant="title" style={[styles.rank, { color: theme.colors.brand.gold }]}>
        {entry.rank}
      </ThemedText>
      <ThemedText variant="title" style={styles.name}>
        {isMe ? 'You' : `Player ${entry.player_id.slice(0, 6)}`}
      </ThemedText>
      <ThemedText variant="body" color="secondary">
        {entry.points.toLocaleString()} pts
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 16, paddingBottom: 32 },
  meCard: { marginBottom: 16 },
  meRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rank: { width: 36 },
  name: { flex: 1 },
});
