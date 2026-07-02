import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ScanLine, Wallet } from 'lucide-react-native';

import { Card, Screen, StatusPill, ThemedText } from '../../components';
import { useFeature } from '../../app/providers/FeatureProvider';
import { useManifest } from '../../app/manifest/ManifestProvider';
import { useTheme } from '../../theme/ThemeProvider';
import { OfferCard } from '../offers/OfferCard';
import { useGetAccountMeQuery } from '../account/accountApi';
import { useGetOffersQuery, useGetPromotionsQuery } from '../offers/offersApi';

import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../../app/navigation/types';
import type { OfferOut } from '../offers/offersApi';

type Props = BottomTabScreenProps<MainTabParamList, 'Home'>;

/** H1 — Home: brandable hero + tier/points, promotions carousel, quick actions, featured offer. */
export function HomeScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme();
  const { manifest } = useManifest();
  const me = useGetAccountMeQuery();
  const promotions = useGetPromotionsQuery();
  const offers = useGetOffersQuery();
  const cashless = useFeature('cardless');

  const greetingName = me.data?.email?.split('@')[0] ?? 'there';
  const featured = offers.data?.[0];

  const openPromotion = (promotion: OfferOut): void =>
    navigation.navigate('Offers', { screen: 'PromotionDetail', params: { promotion } });
  const openOffer = (offer: OfferOut): void =>
    navigation.navigate('Offers', { screen: 'OfferDetail', params: { offer } });

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Hero */}
        <ThemedText variant="kicker" color="muted">
          {manifest?.name ?? 'Welcome'}
        </ThemedText>
        <ThemedText variant="display" style={{ color: theme.colors.brand.gold }}>
          Hi {greetingName}
        </ThemedText>

        {/* Tier + points snapshot */}
        <Card style={styles.tierCard}>
          <View style={styles.tierRow}>
            <View>
              <ThemedText variant="label" color="muted">
                Tier
              </ThemedText>
              <ThemedText variant="h2" style={{ textTransform: 'capitalize' }}>
                {me.data?.tier ?? '—'}
              </ThemedText>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <ThemedText variant="label" color="muted">
                Points
              </ThemedText>
              <ThemedText variant="h2" style={{ color: theme.colors.brand.gold }}>
                {me.data?.points ?? 0}
              </ThemedText>
            </View>
          </View>
          {me.data?.segment ? (
            <View style={styles.segmentPill}>
              <StatusPill label={me.data.segment} tone="purple" />
            </View>
          ) : null}
        </Card>

        {/* Quick actions */}
        <View style={styles.actions}>
          <QuickAction
            icon={<ScanLine size={22} color={theme.colors.brand.onGold} />}
            label={cashless ? 'Scan / Play' : 'Wallet'}
            onPress={() => navigation.navigate('Play')}
          />
          <QuickAction
            icon={<Wallet size={22} color={theme.colors.brand.onGold} />}
            label="Wallet"
            onPress={() => navigation.navigate('Play')}
          />
        </View>

        {/* Promotions carousel */}
        {promotions.data && promotions.data.length > 0 ? (
          <>
            <ThemedText variant="title" style={styles.sectionTitle}>
              Promotions
            </ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {promotions.data.map((p) => (
                <View key={p.id} style={styles.carouselItem}>
                  <OfferCard offer={p} onPress={() => openPromotion(p)} />
                </View>
              ))}
            </ScrollView>
          </>
        ) : null}

        {/* Featured offer */}
        {featured ? (
          <>
            <ThemedText variant="title" style={styles.sectionTitle}>
              Featured offer
            </ThemedText>
            <OfferCard offer={featured} onPress={() => openOffer(featured)} />
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}): React.JSX.Element {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={styles.action} accessibilityRole="button">
      <View style={[styles.actionIcon, { backgroundColor: theme.colors.brand.gold }]}>{icon}</View>
      <ThemedText variant="label" color="secondary" style={{ marginTop: 6 }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 16, paddingBottom: 32 },
  tierCard: { marginTop: 20 },
  tierRow: { flexDirection: 'row', justifyContent: 'space-between' },
  segmentPill: { marginTop: 12 },
  actions: { flexDirection: 'row', marginTop: 24 },
  action: { alignItems: 'center', marginRight: 28 },
  actionIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { marginTop: 28, marginBottom: 12 },
  carouselItem: { width: 260, marginRight: 12 },
});
