import {
  ChevronRight,
  CreditCard,
  ScrollText,
  ShieldCheck,
  TrendingUp,
  User,
} from 'lucide-react-native';
import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { Card, ListRow, ProgressBar, Screen, StatusPill, ThemedText } from '../../components';
import { useTheme } from '../../theme/ThemeProvider';

import { useGetAccountMeQuery } from './accountApi';
import { kycTone } from './kyc';
import { tierProgress } from './tiers';

import type { AccountStackParamList } from './types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<AccountStackParamList, 'AccountHome'>;

/** C1 — Account home: member snapshot, tier progress, and quick links to the loyalty/profile hub. */
export function AccountHomeScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme();
  const me = useGetAccountMeQuery();

  const points = me.data?.points ?? 0;
  const progress = tierProgress(points, me.data?.tier ?? 'bronze');
  const memberName = me.data?.email?.split('@')[0] ?? 'Member';

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={me.isFetching} onRefresh={() => void me.refetch()} />
        }
      >
        {/* Member card summary */}
        <Card style={[styles.card, { backgroundColor: theme.colors.brand.gold }]}>
          <ThemedText variant="kicker" style={{ color: theme.colors.brand.onGold }}>
            Member
          </ThemedText>
          <ThemedText variant="h2" style={{ color: theme.colors.brand.onGold }}>
            {memberName}
          </ThemedText>
          <View style={styles.cardFooter}>
            <View>
              <ThemedText variant="label" style={{ color: theme.colors.brand.onGold }}>
                {progress.current.label} tier
              </ThemedText>
              <ThemedText variant="display" style={{ color: theme.colors.brand.onGold }}>
                {points.toLocaleString()}
                <ThemedText variant="body" style={{ color: theme.colors.brand.onGold }}>
                  {' '}
                  pts
                </ThemedText>
              </ThemedText>
            </View>
            <CreditCard size={28} color={theme.colors.brand.onGold} />
          </View>
        </Card>

        {/* Tier progress */}
        <Card style={styles.card}>
          <View style={styles.rowBetween}>
            <ThemedText variant="title">{progress.current.label}</ThemedText>
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

        {/* KYC status banner */}
        <Card style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={styles.kycLabel}>
              <ShieldCheck size={18} color={theme.colors.text.muted} />
              <ThemedText variant="title" style={styles.kycText}>
                Verification
              </ThemedText>
            </View>
            <StatusPill
              label={me.data?.kyc_status ?? 'unknown'}
              tone={kycTone(me.data?.kyc_status)}
            />
          </View>
        </Card>

        {/* Quick links */}
        <ThemedText variant="label" color="muted" style={styles.sectionLabel}>
          Loyalty & profile
        </ThemedText>
        <Card style={styles.card}>
          <View>
            <ListRow
              icon={<CreditCard size={20} color={theme.colors.text.secondary} />}
              title="Member card"
              subtitle="Show your digital card"
              onPress={() => navigation.navigate('MemberCard')}
            />
            <ListRow
              icon={<TrendingUp size={20} color={theme.colors.text.secondary} />}
              title="Tier & benefits"
              subtitle={`${progress.current.label} — ${progress.current.benefits.length} benefits`}
              onPress={() => navigation.navigate('TierBenefits')}
            />
            <ListRow
              icon={<ScrollText size={20} color={theme.colors.text.secondary} />}
              title="Activity & win/loss"
              subtitle="Statement of play"
              onPress={() => navigation.navigate('Activity')}
            />
            <ListRow
              icon={<User size={20} color={theme.colors.text.secondary} />}
              title="Profile"
              subtitle={me.data?.email ?? undefined}
              onPress={() => navigation.navigate('Profile')}
            />
            <ListRow
              icon={<ShieldCheck size={20} color={theme.colors.text.secondary} />}
              title="Verification (KYC)"
              value={me.data?.kyc_status ?? undefined}
              onPress={() => navigation.navigate('Kyc')}
            />
          </View>
        </Card>

        <ListRow
          icon={<ChevronRight size={20} color={theme.colors.text.secondary} />}
          title="Responsible gaming"
          subtitle="Limits, cool-off & resources"
          onPress={() => navigation.navigate('ResponsibleGaming')}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 16, paddingBottom: 32 },
  card: { marginBottom: 16 },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progress: { marginVertical: 12 },
  kycLabel: { flexDirection: 'row', alignItems: 'center' },
  kycText: { marginLeft: 8 },
  sectionLabel: { marginBottom: 8 },
});
