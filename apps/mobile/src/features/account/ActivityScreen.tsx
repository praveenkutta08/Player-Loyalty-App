import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

import { Card, Screen, SegmentedControl, ThemedText } from '../../components';
import { useTheme } from '../../theme/ThemeProvider';

import { useGetActivityQuery } from './accountApi';

import type { ActivityItem } from './accountApi';
import type { Segment } from '../../components';

type FilterKey = 'all' | 'earn' | 'redeem' | 'play';

const FILTERS: ReadonlyArray<Segment<FilterKey>> = [
  { key: 'all', label: 'All' },
  { key: 'earn', label: 'Earned' },
  { key: 'redeem', label: 'Redeemed' },
  { key: 'play', label: 'Play' },
];

/** Which activity `type` values fall under each filter tab. */
function matchesFilter(item: ActivityItem, filter: FilterKey): boolean {
  if (filter === 'all') return true;
  const type = item.type.toLowerCase();
  if (filter === 'earn') return item.points > 0 || type.includes('earn');
  if (filter === 'redeem') return type.includes('redeem') || type.includes('reward');
  if (filter === 'play')
    return type.includes('play') || type.includes('bet') || type.includes('win');
  return true;
}

/** C4 — Activity / win-loss statement: filterable list with a running net win/loss summary. */
export function ActivityScreen(): React.JSX.Element {
  const theme = useTheme();
  const [filter, setFilter] = useState<FilterKey>('all');
  const activity = useGetActivityQuery();

  const items = useMemo(
    () => (activity.data ?? []).filter((i) => matchesFilter(i, filter)),
    [activity.data, filter],
  );

  const net = useMemo(() => items.reduce((sum, i) => sum + i.amount_cents, 0), [items]);

  return (
    <Screen edges={['bottom']}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshing={activity.isFetching}
        onRefresh={() => void activity.refetch()}
        ListHeaderComponent={
          <View style={styles.header}>
            <SegmentedControl segments={FILTERS} value={filter} onChange={setFilter} />
            <Card style={styles.summary}>
              <ThemedText variant="label" color="muted">
                Net win / loss
              </ThemedText>
              <ThemedText
                variant="h2"
                style={{ color: net >= 0 ? theme.colors.state.success : theme.colors.state.error }}
              >
                {formatMoney(net)}
              </ThemedText>
            </Card>
          </View>
        }
        ItemSeparatorComponent={() => (
          <View style={[styles.sep, { backgroundColor: theme.colors.border.soft }]} />
        )}
        ListEmptyComponent={
          activity.isLoading ? (
            <ActivityIndicator style={styles.loader} color={theme.colors.brand.gold} />
          ) : (
            <ThemedText variant="body" color="muted" style={styles.empty}>
              No activity yet.
            </ThemedText>
          )
        }
        renderItem={({ item }) => <ActivityRow item={item} />}
      />
    </Screen>
  );
}

function ActivityRow({ item }: { item: ActivityItem }): React.JSX.Element {
  const theme = useTheme();
  const positive = item.amount_cents >= 0;
  return (
    <View style={styles.row}>
      <View style={styles.rowBody}>
        <ThemedText variant="title">{item.description}</ThemedText>
        <ThemedText variant="body" color="muted">
          {formatDate(item.at)}
          {item.points !== 0 ? ` · ${item.points > 0 ? '+' : ''}${item.points} pts` : ''}
        </ThemedText>
      </View>
      <ThemedText
        variant="title"
        style={{ color: positive ? theme.colors.state.success : theme.colors.text.primary }}
      >
        {formatMoney(item.amount_cents)}
      </ThemedText>
    </View>
  );
}

function formatMoney(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

const styles = StyleSheet.create({
  header: { paddingTop: 16 },
  summary: { marginTop: 12, marginBottom: 8 },
  loader: { marginTop: 32 },
  list: { paddingBottom: 32 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  rowBody: { flex: 1, marginRight: 12 },
  sep: { height: StyleSheet.hairlineWidth },
  empty: { textAlign: 'center', marginTop: 32 },
});
