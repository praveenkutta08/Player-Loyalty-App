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

import {
  CapsLabel,
  GlassCard,
  HairlineRow,
  Kicker,
  ProgressRing,
  Screen,
  StatusPill,
  ThemedText,
} from '../../components';
import { withAlpha } from '../../theme/color';
import { useTheme } from '../../theme/ThemeProvider';

import { useGetAccountMeQuery } from './accountApi';
import { kycTone } from './kyc';
import { tierProgress } from './tiers';

import type { AccountStackParamList } from './types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { LucideIcon } from 'lucide-react-native';

type Props = NativeStackScreenProps<AccountStackParamList, 'AccountHome'>;

/**
 * C1 — Account home, re-skinned to obsidian luxury (RS5): a circular tier progress ring (points in
 * Playfair, "X points until <next tier>"), then the loyalty/profile hub and the Verification (KYC)
 * + Responsible Gaming entries as glass hairline rows — both kept present and correctly routed.
 */
export function AccountHomeScreen({ navigation }: Props): React.JSX.Element {
  const me = useGetAccountMeQuery();

  const points = me.data?.points ?? 0;
  const progress = tierProgress(points, me.data?.tier ?? 'bronze');
  const memberName = me.data?.email?.split('@')[0] ?? 'Member';

  return (
    <Screen padded={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={me.isFetching} onRefresh={() => void me.refetch()} />
        }
      >
        {/* Tier progress ring */}
        <View style={styles.ringBlock}>
          <Kicker color="secondary">{memberName}</Kicker>
          <View style={styles.ring}>
            <ProgressRing ratio={progress.ratio}>
              <ThemedText variant="display">{points.toLocaleString()}</ThemedText>
              <CapsLabel color="muted">Points</CapsLabel>
            </ProgressRing>
          </View>
          <ThemedText variant="h2" style={styles.tierLabel}>
            {progress.current.label}
          </ThemedText>
          <ThemedText variant="bodySm" color="secondary" style={styles.toNext}>
            {progress.next
              ? `${progress.pointsToNext.toLocaleString()} points until ${progress.next.label}`
              : 'You have reached the highest tier.'}
          </ThemedText>
        </View>

        <View style={styles.body}>
          {/* Loyalty & profile */}
          <CapsLabel style={styles.sectionLabel}>Loyalty &amp; Profile</CapsLabel>
          <GlassCard bare>
            <BenefitRow
              icon={CreditCard}
              title="Member card"
              subtitle="Show your digital card"
              onPress={() => navigation.navigate('MemberCard')}
            />
            <BenefitRow
              icon={TrendingUp}
              title="Tier & benefits"
              subtitle={`${progress.current.label} — ${progress.current.benefits.length} benefits`}
              onPress={() => navigation.navigate('TierBenefits')}
            />
            <BenefitRow
              icon={ScrollText}
              title="Activity & win/loss"
              subtitle="Statement of play"
              onPress={() => navigation.navigate('Activity')}
            />
            <BenefitRow
              icon={User}
              title="Profile"
              subtitle={me.data?.email ?? undefined}
              onPress={() => navigation.navigate('Profile')}
              divider={false}
            />
          </GlassCard>

          {/* Compliance — KYC + Responsible Gaming, always present + gated server-side. */}
          <CapsLabel style={styles.sectionLabel}>Account &amp; Safety</CapsLabel>
          <GlassCard bare>
            <BenefitRow
              icon={ShieldCheck}
              title="Verification (KYC)"
              onPress={() => navigation.navigate('Kyc')}
              trailing={
                <StatusPill
                  label={me.data?.kyc_status ?? 'unknown'}
                  tone={kycTone(me.data?.kyc_status)}
                />
              }
            />
            <BenefitRow
              icon={ChevronRight}
              title="Responsible gaming"
              subtitle="Limits, cool-off & resources"
              onPress={() => navigation.navigate('ResponsibleGaming')}
              divider={false}
            />
          </GlassCard>
        </View>
      </ScrollView>
    </Screen>
  );
}

function BenefitRow({
  icon: Icon,
  title,
  subtitle,
  onPress,
  trailing,
  divider = true,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  onPress: () => void;
  trailing?: React.ReactNode;
  divider?: boolean;
}): React.JSX.Element {
  const theme = useTheme();
  const c = theme.colors;
  return (
    <HairlineRow onPress={onPress} divider={divider} style={styles.row}>
      <View
        style={[
          styles.chip,
          {
            backgroundColor: withAlpha(c.brand.accent, 0.1),
            borderColor: c.border.ghost ?? c.border.strong,
          },
        ]}
      >
        <Icon size={18} color={c.brand.accent} />
      </View>
      <View style={styles.rowBody}>
        <ThemedText variant="title">{title}</ThemedText>
        {subtitle ? (
          <ThemedText variant="mono" color="muted" numberOfLines={1}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {trailing ?? <ChevronRight size={18} color={c.text.muted} />}
    </HairlineRow>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 32 },
  ringBlock: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 24 },
  ring: { marginTop: 24 },
  tierLabel: { marginTop: 20, textTransform: 'capitalize' },
  toNext: { marginTop: 6, textAlign: 'center' },
  body: { paddingHorizontal: 24, marginTop: 32 },
  sectionLabel: { marginTop: 24, marginBottom: 12 },
  row: { marginHorizontal: 16 },
  chip: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  rowBody: { flex: 1 },
});
