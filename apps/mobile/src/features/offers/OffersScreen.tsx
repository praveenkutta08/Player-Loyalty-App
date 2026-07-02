import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet } from 'react-native';

import { useFeature } from '../../app/providers/FeatureProvider';
import { useAppSelector } from '../../app/store';
import { Input, Screen, SegmentedControl, ThemedText } from '../../components';
import { useTheme } from '../../theme/ThemeProvider';
import { useTrackEventMutation } from '../analytics/analyticsApi';
import { ForYouPanel } from '../concierge/ForYouPanel';
import { MyRewardsPanel } from '../rewards/MyRewardsPanel';

import { OfferCard } from './OfferCard';
import { useGetOffersQuery, useGetPromotionsQuery } from './offersApi';
import { buildSegments, initialSegment } from './segments';

import type { OfferOut } from './offersApi';
import type { OffersSegment } from './segments';
import type { OffersStackParamList } from './types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<OffersStackParamList, 'OffersHome'>;

/**
 * O1/O3 — segmented Offers tab. With the `concierge` flag on, a ranked "For You" view leads
 * (why-you pills, P6.6) and the full list stays one segment away; flag off keeps the classic
 * Offers | Promotions | My Rewards.
 */
export function OffersScreen({ navigation, route }: Props): React.JSX.Element {
  const theme = useTheme();
  const conciergeOn = useFeature('concierge');
  const [segment, setSegment] = useState<OffersSegment>(
    initialSegment(route.params?.tab, conciergeOn),
  );
  const [query, setQuery] = useState('');
  const segments = buildSegments(conciergeOn);

  const offers = useGetOffersQuery();
  const promotions = useGetPromotionsQuery();
  const redeemedIds = useAppSelector((s) => s.redeemed.offerIds);

  const active = segment === 'promotions' ? promotions : offers;
  const items = useMemo(() => {
    const list = (active.data ?? []).filter((o) =>
      o.title.toLowerCase().includes(query.trim().toLowerCase()),
    );
    return list;
  }, [active.data, query]);

  const [trackEvent] = useTrackEventMutation();

  const openItem = (item: OfferOut): void => {
    if (item.kind === 'promotion') navigation.navigate('PromotionDetail', { promotion: item });
    else navigation.navigate('OfferDetail', { offer: item });
  };
  // The CTR-lift experiment pair (P6.7): ranked For You clicks vs plain-list clicks.
  const openFromList = (item: OfferOut): void => {
    void trackEvent({ type: 'list_offer_click', entity_id: item.id });
    openItem(item);
  };

  return (
    <Screen>
      <ThemedText variant="h1" style={styles.title}>
        Offers
      </ThemedText>
      <SegmentedControl segments={segments} value={segment} onChange={setSegment} />

      {segment === 'foryou' ? (
        <ForYouPanel
          onOpenOffer={(ranked) => {
            void trackEvent({
              type: 'for_you_offer_click',
              entity_id: ranked.offer_id,
              meta: { rank: ranked.rank },
            });
            // Ranked entries reference full offers by id; open from the loaded list.
            const full = offers.data?.find((o) => o.id === ranked.offer_id);
            if (full) openItem(full);
          }}
        />
      ) : segment === 'rewards' ? (
        <MyRewardsPanel onBrowse={() => navigation.navigate('RewardsMarketplace')} />
      ) : (
        <>
          <Input
            value={query}
            onChangeText={setQuery}
            placeholder={`Search ${segment}`}
            autoCapitalize="none"
            containerStyle={styles.search}
          />
          <FlatList
            data={items}
            keyExtractor={(o) => o.id}
            renderItem={({ item }) => (
              <OfferCard
                offer={item}
                redeemed={redeemedIds.includes(item.id)}
                onPress={() => openFromList(item)}
              />
            )}
            refreshControl={
              <RefreshControl
                refreshing={active.isFetching}
                onRefresh={active.refetch}
                tintColor={theme.colors.brand.gold}
              />
            }
            ListEmptyComponent={
              active.isLoading ? null : (
                <ThemedText variant="body" color="muted" style={styles.emptyText}>
                  Nothing here yet.
                </ThemedText>
              )
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: 16 },
  search: { marginTop: 16, marginBottom: 8 },
  list: { paddingTop: 8, paddingBottom: 24 },
  emptyText: { textAlign: 'center', marginTop: 40 },
});
