import { Coins, Gift } from 'lucide-react-native';
import React from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { Card, Screen, StatusPill, ThemedText } from '../../components';
import { useTheme } from '../../theme/ThemeProvider';
import { useGetPointsQuery } from '../account/accountApi';

import { canAfford, inStock } from './redeem';
import { useGetRewardsQuery } from './rewardsApi';

import type { RewardItemOut } from './rewardsApi';
import type { OffersStackParamList } from '../offers/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<OffersStackParamList, 'RewardsMarketplace'>;

/** C6 — Rewards marketplace: points catalog with cost + affordability against the balance. */
export function RewardsMarketplaceScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme();
  const rewards = useGetRewardsQuery();
  const points = useGetPointsQuery();
  const balance = points.data?.points ?? 0;

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={rewards.isFetching}
            onRefresh={() => void rewards.refetch()}
          />
        }
      >
        <Card style={[styles.balance, { backgroundColor: theme.colors.brand.gold }]}>
          <View style={styles.balanceHead}>
            <Coins size={18} color={theme.colors.brand.onGold} />
            <ThemedText
              variant="label"
              style={[styles.balanceLabel, { color: theme.colors.brand.onGold }]}
            >
              Points balance
            </ThemedText>
          </View>
          <ThemedText variant="display" style={{ color: theme.colors.brand.onGold }}>
            {balance.toLocaleString()}
          </ThemedText>
        </Card>

        <Card>
          {(rewards.data ?? []).length === 0 ? (
            <ThemedText variant="body" color="muted">
              {rewards.isFetching ? 'Loading…' : 'No rewards available yet.'}
            </ThemedText>
          ) : (
            (rewards.data ?? []).map((item) => (
              <RewardRow
                key={item.id}
                item={item}
                affordable={canAfford(balance, item.points_cost)}
                onPress={() => navigation.navigate('RewardDetail', { item })}
              />
            ))
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}

function RewardRow({
  item,
  affordable,
  onPress,
}: {
  item: RewardItemOut;
  affordable: boolean;
  onPress: () => void;
}): React.JSX.Element {
  const theme = useTheme();
  const soldOut = !inStock(item.stock);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[styles.row, { borderBottomColor: theme.colors.border.soft }]}
    >
      <View style={[styles.thumb, { backgroundColor: theme.colors.bg.base }]}>
        <Gift size={20} color={theme.colors.text.muted} />
      </View>
      <View style={styles.body}>
        <ThemedText variant="title" numberOfLines={1}>
          {item.title}
        </ThemedText>
        <ThemedText variant="label" color="muted">
          {item.points_cost.toLocaleString()} pts
        </ThemedText>
      </View>
      {soldOut ? (
        <StatusPill label="Out of stock" tone="muted" />
      ) : !affordable ? (
        <StatusPill label="Not enough pts" tone="warning" />
      ) : (
        <StatusPill label="Redeemable" tone="success" />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 16, paddingBottom: 32 },
  balance: { marginBottom: 16 },
  balanceHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  balanceLabel: { marginLeft: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  body: { flex: 1 },
});
