import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { CapsLabel, ImmersiveCard, Kicker, PillButton, Screen, ThemedText } from '../../components';
import { useTheme } from '../../theme/ThemeProvider';
import { useGetPointsQuery } from '../account/accountApi';

import { canAfford, inStock } from './redeem';
import { useGetRewardsQuery } from './rewardsApi';

import type { RewardItemOut } from './rewardsApi';
import type { OffersStackParamList } from '../offers/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<OffersStackParamList, 'RewardsMarketplace'>;

/**
 * C6 — Rewards marketplace, re-skinned to obsidian luxury (RS5): a Playfair points-balance header
 * and the catalog as stacked ImmersiveCards (item photo or gradient, CURATED kicker, Playfair name,
 * points cost + affordability). Redemption + points logic (canAfford / inStock) is unchanged.
 */
export function RewardsMarketplaceScreen({ navigation }: Props): React.JSX.Element {
  const rewards = useGetRewardsQuery();
  const points = useGetPointsQuery();
  const balance = points.data?.points ?? 0;
  const items = rewards.data ?? [];

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
        <Kicker color="secondary">Points Balance</Kicker>
        <ThemedText variant="display" style={styles.balance}>
          {balance.toLocaleString()}
        </ThemedText>

        <CapsLabel style={styles.sectionLabel}>Marketplace · View All</CapsLabel>

        {items.length === 0 ? (
          <ThemedText variant="body" color="muted" style={styles.empty}>
            {rewards.isFetching ? 'Loading…' : 'No rewards available yet.'}
          </ThemedText>
        ) : (
          items.map((item) => (
            <RewardCard
              key={item.id}
              item={item}
              affordable={canAfford(balance, item.points_cost)}
              onPress={() => navigation.navigate('RewardDetail', { item })}
            />
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

function RewardCard({
  item,
  affordable,
  onPress,
}: {
  item: RewardItemOut;
  affordable: boolean;
  onPress: () => void;
}): React.JSX.Element {
  const theme = useTheme();
  const c = theme.colors;
  const soldOut = !inStock(item.stock);
  const cost = `${item.points_cost.toLocaleString()} pts`;

  return (
    <View style={styles.card}>
      <ImmersiveCard
        image={item.image_url ? { uri: item.image_url } : undefined}
        kicker="Curated"
        title={item.title}
        height={200}
        onPress={onPress}
        actions={
          <View style={styles.actionRow}>
            <ThemedText variant="mono" style={{ color: c.brand.accent }}>
              {cost}
            </ThemedText>
            {soldOut ? (
              <CapsLabel color="muted">Out of stock</CapsLabel>
            ) : (
              <PillButton
                label={affordable ? 'Redeem' : 'Not enough'}
                variant={affordable ? 'accent' : 'secondary'}
                onPress={onPress}
                disabled={!affordable}
              />
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 16, paddingBottom: 32 },
  balance: { marginTop: 8 },
  sectionLabel: { marginTop: 32, marginBottom: 12 },
  empty: { paddingVertical: 16 },
  card: { marginBottom: 16 },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
