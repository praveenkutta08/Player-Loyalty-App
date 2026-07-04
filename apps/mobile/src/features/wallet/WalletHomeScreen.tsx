import { ArrowDownToLine, ArrowUpFromLine, CreditCard, Send } from 'lucide-react-native';
import React from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { useManifest } from '../../app/manifest/ManifestProvider';
import {
  CapsLabel,
  GlassCard,
  HairlineRow,
  Kicker,
  Screen,
  StatusPill,
  ThemedText,
} from '../../components';
import { withAlpha } from '../../theme/color';
import { useTheme } from '../../theme/ThemeProvider';
import { useGetAccountMeQuery } from '../account/accountApi';

import { MemberCard } from './MemberCard';
import { formatMoney } from './money';
import { TransactionRow } from './TransactionRow';
import { useGetTransactionsQuery, useGetWalletQuery } from './walletApi';

import type { WalletStackParamList } from './types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { LucideIcon } from 'lucide-react-native';

type Props = NativeStackScreenProps<WalletStackParamList, 'WalletHome'>;

/**
 * S5 — Wallet home, re-skinned to obsidian luxury (RS3): a metallic digital member card, a Playfair
 * balance block with the available credit in indigo, a 3-up glass action row, and the recent ledger
 * as inset hairline rows. All money values and idempotency logic are unchanged.
 */
export function WalletHomeScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme();
  const c = theme.colors;
  const { manifest } = useManifest();
  const wallet = useGetWalletQuery();
  const me = useGetAccountMeQuery();
  const txns = useGetTransactionsQuery();
  const recent = (txns.data ?? []).slice(0, 5);
  const refreshing = wallet.isFetching || txns.isFetching;
  const balance = wallet.data?.balance_cents ?? 0;

  return (
    <Screen padded={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void wallet.refetch();
              void txns.refetch();
            }}
          />
        }
      >
        <MemberCard
          tier={me.data?.tier}
          walletId={wallet.data?.id}
          brandName={manifest?.name ?? 'Executive Companion'}
        />

        {/* Balance block */}
        <View style={styles.balanceBlock}>
          <CapsLabel color="muted">Current Balance</CapsLabel>
          <ThemedText variant="display" style={styles.balance}>
            {formatMoney(balance)}
          </ThemedText>
          <View style={styles.availRow}>
            <Kicker color="secondary">Available Credit</Kicker>
            <ThemedText variant="mono" style={{ color: c.brand.accent }}>
              {formatMoney(balance)}
            </ThemedText>
          </View>
          {wallet.data?.status && wallet.data.status !== 'active' ? (
            <View style={{ marginTop: 8 }}>
              <StatusPill label={wallet.data.status} tone="warning" />
            </View>
          ) : null}
        </View>

        {/* 3-up glass action row */}
        <View style={styles.actions}>
          <WalletAction
            icon={ArrowDownToLine}
            label="Deposit"
            onPress={() => navigation.navigate('Deposit')}
            testID="wallet-deposit"
          />
          <WalletAction
            icon={ArrowUpFromLine}
            label="Withdraw"
            onPress={() => navigation.navigate('Withdraw')}
          />
          <WalletAction
            icon={Send}
            label="Transfer"
            onPress={() => navigation.navigate('Transfer')}
          />
        </View>

        <View style={styles.section}>
          <HairlineRow
            onPress={() => navigation.navigate('PaymentMethods')}
            divider={false}
            style={styles.pmRow}
          >
            <View
              style={[
                styles.pmIcon,
                {
                  backgroundColor: withAlpha(c.brand.accent, 0.1),
                  borderColor: c.border.ghost ?? c.border.strong,
                },
              ]}
            >
              <CreditCard size={18} color={c.brand.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText variant="title">Payment methods</ThemedText>
              <ThemedText variant="mono" color="muted">
                Manage saved cards
              </ThemedText>
            </View>
          </HairlineRow>
        </View>

        {/* Recent transactions */}
        <View style={styles.recentHead}>
          <CapsLabel>Recent Transactions</CapsLabel>
          {recent.length > 0 ? (
            <Pressable onPress={() => navigation.navigate('TransactionHistory')} hitSlop={8}>
              <CapsLabel color="faint">View All</CapsLabel>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.ledger}>
          {txns.isError ? (
            <ThemedText variant="body" color="muted" style={styles.ledgerMsg}>
              Couldn’t load transactions. Pull to retry.
            </ThemedText>
          ) : recent.length === 0 ? (
            <ThemedText variant="body" color="muted" style={styles.ledgerMsg}>
              No transactions yet. Make a deposit to get started.
            </ThemedText>
          ) : (
            recent.map((t) => (
              <TransactionRow
                key={t.id}
                txn={t}
                onPress={() => navigation.navigate('TransactionDetail', { id: t.id })}
              />
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

function WalletAction({
  icon: Icon,
  label,
  onPress,
  testID,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  testID?: string;
}): React.JSX.Element {
  const theme = useTheme();
  return (
    <Pressable
      style={styles.actionWrap}
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
    >
      <GlassCard style={styles.actionCard} bare>
        <View style={styles.actionInner}>
          <Icon size={22} color={theme.colors.brand.accent} />
          <ThemedText variant="label" color="secondary" style={{ marginTop: 8 }}>
            {label}
          </ThemedText>
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32 },
  balanceBlock: { marginTop: 32 },
  balance: { marginTop: 8 },
  availRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  actions: { flexDirection: 'row', gap: 12, marginTop: 32 },
  actionWrap: { flex: 1 },
  actionCard: { alignItems: 'stretch' },
  actionInner: { alignItems: 'center', paddingVertical: 18 },
  section: { marginTop: 24 },
  pmRow: { marginHorizontal: 0, paddingVertical: 0 },
  pmIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  recentHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 40,
    marginBottom: 8,
  },
  ledger: {},
  ledgerMsg: { paddingVertical: 16 },
});
