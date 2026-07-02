import { CheckCircle2, Coins, XCircle } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button, Card, Screen, StatusPill, ThemedText } from '../../components';
import { useTheme } from '../../theme/ThemeProvider';
import { useGetPointsQuery } from '../account/accountApi';

import { canAfford, inStock, redeemOutcome, redeemOutcomeMessage } from './redeem';
import { useRedeemRewardMutation } from './rewardsApi';

import type { RedeemOutcome } from './redeem';
import type { OffersStackParamList } from '../offers/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<OffersStackParamList, 'RewardDetail'>;
type State = 'idle' | 'redeeming' | 'success' | RedeemOutcome;

/** C7 — Reward detail + idempotent redeem, with success / insufficient / out-of-stock outcomes. */
export function RewardDetailScreen({ route, navigation }: Props): React.JSX.Element {
  const theme = useTheme();
  const { item } = route.params;
  const points = useGetPointsQuery();
  const [redeem] = useRedeemRewardMutation();
  const [state, setState] = useState<State>('idle');

  const balance = points.data?.points ?? 0;
  const affordable = canAfford(balance, item.points_cost);
  const stocked = inStock(item.stock);

  async function doRedeem(): Promise<void> {
    setState('redeeming');
    try {
      await redeem({ itemId: item.id }).unwrap();
      setState('success');
    } catch (err) {
      setState(redeemOutcome(err));
    }
  }

  if (state === 'success') {
    return (
      <Screen>
        <Card style={styles.result}>
          <CheckCircle2 size={48} color={theme.colors.state.success} />
          <ThemedText variant="h2" style={styles.resultTitle}>
            Reward redeemed
          </ThemedText>
          <ThemedText variant="body" color="muted" style={styles.resultBody}>
            {item.points_cost.toLocaleString()} pts spent on {item.title}.
          </ThemedText>
          <Button
            label="View my rewards"
            style={styles.resultBtn}
            onPress={() => navigation.navigate('OffersHome', { tab: 'rewards' })}
          />
        </Card>
      </Screen>
    );
  }

  const failure = state !== 'idle' && state !== 'redeeming' ? (state as RedeemOutcome) : null;

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <ThemedText variant="h1">{item.title}</ThemedText>
        <View style={styles.cost}>
          <Coins size={18} color={theme.colors.brand.gold} />
          <ThemedText variant="title" style={styles.costText}>
            {item.points_cost.toLocaleString()} pts
          </ThemedText>
          {!stocked ? <StatusPill label="Out of stock" tone="muted" /> : null}
        </View>

        {item.terms ? (
          <Card style={styles.terms}>
            <ThemedText variant="label" color="muted">
              Terms
            </ThemedText>
            <ThemedText variant="body" style={styles.termsBody}>
              {item.terms}
            </ThemedText>
          </Card>
        ) : null}

        <Card style={styles.balanceCard}>
          <View style={styles.balanceRow}>
            <ThemedText variant="body" color="muted">
              Your balance
            </ThemedText>
            <ThemedText variant="title">{balance.toLocaleString()} pts</ThemedText>
          </View>
          <View style={styles.balanceRow}>
            <ThemedText variant="body" color="muted">
              After redeeming
            </ThemedText>
            <ThemedText variant="title">
              {Math.max(balance - item.points_cost, 0).toLocaleString()} pts
            </ThemedText>
          </View>
        </Card>

        {failure ? (
          <View style={styles.failure}>
            <XCircle size={18} color={theme.colors.state.error} />
            <ThemedText variant="body" style={[styles.failureText, { color: theme.colors.state.error }]}>
              {redeemOutcomeMessage(failure)}
            </ThemedText>
          </View>
        ) : null}

        <Button
          label={failure ? 'Try again' : 'Redeem'}
          loading={state === 'redeeming'}
          disabled={!affordable || !stocked || state === 'redeeming'}
          onPress={() => void doRedeem()}
          testID="redeem-reward"
        />
        {!affordable && stocked ? (
          <ThemedText variant="label" color="muted" style={styles.hint}>
            You need {(item.points_cost - balance).toLocaleString()} more points.
          </ThemedText>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 16, paddingBottom: 32 },
  cost: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, marginBottom: 16 },
  costText: { marginRight: 4 },
  terms: { marginBottom: 16 },
  termsBody: { marginTop: 4 },
  balanceCard: { marginBottom: 16 },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  failure: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  failureText: { marginLeft: 8, flex: 1 },
  hint: { marginTop: 10, textAlign: 'center' },
  result: { alignItems: 'center', paddingVertical: 32, marginTop: 24 },
  resultTitle: { marginTop: 16 },
  resultBody: { marginTop: 8, marginBottom: 20, textAlign: 'center' },
  resultBtn: { alignSelf: 'stretch' },
});
