import React from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { ThemedText } from '../../components';
import { useTheme } from '../../theme/ThemeProvider';

import { RankedOfferCard } from './components';
import { useGetConciergeOffersQuery } from './conciergeApi';

import type { RankedOffer } from './types';

/**
 * "For You" segment of the Offers tab (P6.6): server-ranked offers with why-you reasons. The
 * full list stays one segment away (it's also the control group for the CTR-lift metric).
 */
export function ForYouPanel({
  onOpenOffer,
}: {
  onOpenOffer: (offer: RankedOffer) => void;
}): React.JSX.Element {
  const theme = useTheme();
  const query = useGetConciergeOffersQuery();
  const items = query.data?.items ?? [];

  return (
    <FlatList
      data={items}
      keyExtractor={(o) => o.offer_id}
      renderItem={({ item }) => (
        <View style={styles.item}>
          <RankedOfferCard offer={item} onPress={() => onOpenOffer(item)} />
        </View>
      )}
      ListHeaderComponent={
        query.data ? (
          <ThemedText variant="body" color="muted" style={styles.intro}>
            {query.data.verdict}
          </ThemedText>
        ) : null
      }
      refreshControl={
        <RefreshControl
          refreshing={query.isFetching}
          onRefresh={query.refetch}
          tintColor={theme.colors.brand.gold}
        />
      }
      ListEmptyComponent={
        query.isLoading ? null : (
          <ThemedText variant="body" color="muted" style={styles.empty}>
            No picks yet — check the full offers list.
          </ThemedText>
        )
      }
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingTop: 12, paddingBottom: 24 },
  intro: { marginBottom: 12 },
  item: { marginBottom: 10 },
  empty: { textAlign: 'center', marginTop: 40 },
});
