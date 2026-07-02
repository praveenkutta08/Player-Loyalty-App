import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { useAppSelector } from '../../app/store';
import { Input, Screen, SegmentedControl, ThemedText } from '../../components';
import { useTheme } from '../../theme/ThemeProvider';

import { OfferCard } from './OfferCard';
import { useGetOffersQuery, useGetPromotionsQuery } from './offersApi';

import type { OfferOut } from './offersApi';
import type { OffersStackParamList } from './types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<OffersStackParamList, 'OffersHome'>;
type Segment = 'offers' | 'promotions' | 'rewards';

const SEGMENTS = [
  { key: 'offers' as const, label: 'Offers' },
  { key: 'promotions' as const, label: 'Promotions' },
  { key: 'rewards' as const, label: 'My Rewards' },
];

/** O1/O3 — segmented Offers | Promotions | My Rewards with search (G3). Targeted from the API. */
export function OffersScreen({ navigation, route }: Props): React.JSX.Element {
  const theme = useTheme();
  const [segment, setSegment] = useState<Segment>(route.params?.tab ?? 'offers');
  const [query, setQuery] = useState('');

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

  const openItem = (item: OfferOut): void => {
    if (item.kind === 'promotion') navigation.navigate('PromotionDetail', { promotion: item });
    else navigation.navigate('OfferDetail', { offer: item });
  };

  return (
    <Screen>
      <ThemedText variant="h1" style={styles.title}>
        Offers
      </ThemedText>
      <SegmentedControl segments={SEGMENTS} value={segment} onChange={setSegment} />

      {segment === 'rewards' ? (
        <View style={styles.empty}>
          <ThemedText variant="body" color="muted">
            Your redeemed rewards appear here (P4.12).
          </ThemedText>
        </View>
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
                onPress={() => openItem(item)}
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
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { textAlign: 'center', marginTop: 40 },
});
