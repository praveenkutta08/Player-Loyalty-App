import { Gift } from 'lucide-react-native';
import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { Button, Card, ProgressBar, StatusPill, ThemedText } from '../../components';
import { useTheme } from '../../theme/ThemeProvider';
import { useGetAccountMeQuery } from '../account/accountApi';
import { tierProgress } from '../account/tiers';

import { useGetMyRedemptionsQuery } from './rewardsApi';

import type { RedemptionOut } from './rewardsApi';

/**
 * O5 — "My Rewards" segment: tier progress (C3, "X points to next tier") + redemption history.
 * Browsing opens the rewards marketplace (C6).
 */
export function MyRewardsPanel({ onBrowse }: { onBrowse: () => void }): React.JSX.Element {
  const me = useGetAccountMeQuery();
  const redemptions = useGetMyRedemptionsQuery();

  const points = me.data?.points ?? 0;
  const progress = tierProgress(points, me.data?.tier ?? 'bronze');
  const history = redemptions.data ?? [];

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={me.isFetching || redemptions.isFetching}
          onRefresh={() => {
            void me.refetch();
            void redemptions.refetch();
          }}
        />
      }
    >
        {/* Tier progress (C3) */}
        <Card style={styles.card}>
          <View style={styles.rowBetween}>
            <ThemedText variant="title">{progress.current.label} tier</ThemedText>
            {progress.next ? (
              <ThemedText variant="label" color="muted">
                Next: {progress.next.label}
              </ThemedText>
            ) : (
              <StatusPill label="Top tier" tone="warning" />
            )}
          </View>
          <View style={styles.progress}>
            <ProgressBar ratio={progress.ratio} />
          </View>
          <ThemedText variant="body" color="muted">
            {progress.next
              ? `${progress.pointsToNext.toLocaleString()} pts to ${progress.next.label}`
              : 'You have reached the highest tier.'}
          </ThemedText>
        </Card>

        <Button label="Browse rewards" style={styles.browse} onPress={onBrowse} testID="browse-rewards" />

        <ThemedText variant="label" color="muted" style={styles.label}>
          Redemption history
        </ThemedText>
        <Card>
          {history.length === 0 ? (
            <ThemedText variant="body" color="muted">
              You haven’t redeemed any rewards yet.
            </ThemedText>
          ) : (
            history.map((r) => <RedemptionRow key={r.id} redemption={r} />)
          )}
        </Card>
    </ScrollView>
  );
}

function RedemptionRow({ redemption }: { redemption: RedemptionOut }): React.JSX.Element {
  const theme = useTheme();
  return (
    <View style={[styles.row, { borderBottomColor: theme.colors.border.soft }]}>
      <Gift size={18} color={theme.colors.text.secondary} />
      <View style={styles.rowBody}>
        <ThemedText variant="title">{redemption.points_spent.toLocaleString()} pts</ThemedText>
        <ThemedText variant="label" color="muted">
          {new Date(redemption.redeemed_at).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </ThemedText>
      </View>
      <StatusPill label={redemption.status} tone="success" />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 12, paddingBottom: 32 },
  card: { marginBottom: 12 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progress: { marginVertical: 12 },
  browse: { marginBottom: 16 },
  label: { marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowBody: { flex: 1, marginLeft: 12 },
});
