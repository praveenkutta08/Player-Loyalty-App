import React from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { Screen, ThemedText } from '../../components';

import { TransactionRow } from './TransactionRow';
import { useGetTransactionsQuery } from './walletApi';

import type { WalletStackParamList } from './types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<WalletStackParamList, 'TransactionHistory'>;

/** S9 — Transaction history: the full append-only ledger, newest first, tap a row for detail. */
export function TransactionHistoryScreen({ navigation }: Props): React.JSX.Element {
  const txns = useGetTransactionsQuery();
  const rows = txns.data ?? [];

  return (
    <Screen padded={false}>
      <FlatList
        data={rows}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={txns.isFetching} onRefresh={() => void txns.refetch()} />
        }
        renderItem={({ item }) => (
          <TransactionRow
            txn={item}
            onPress={() => navigation.navigate('TransactionDetail', { id: item.id })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <ThemedText variant="body" color="muted">
              No transactions yet.
            </ThemedText>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingVertical: 8, flexGrow: 1 },
  empty: { alignItems: 'center', paddingTop: 48 },
});
