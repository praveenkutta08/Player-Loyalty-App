import { baseApi } from '@repo/api-client';
import uuid from 'react-native-uuid';

import type { components } from '@repo/api-client';

export type WalletOut = components['schemas']['WalletOut'];
export type TransactionOut = components['schemas']['TransactionOut'];
export type WalletTransactionOut = components['schemas']['WalletTransactionOut'];
export type EgmPairOut = components['schemas']['EgmPairOut'];

/** Fresh idempotency key unless the caller pins one (so a retry of the same attempt is safe). */
const idem = (key?: string): string => key ?? String(uuid.v4());

/**
 * Wallet + cashless endpoints (player audience), injected on the shared baseApi with generated
 * types (GOLDEN RULE #7). Every money move carries an Idempotency-Key so a retry never double-moves
 * funds (GOLDEN RULE #4); each success invalidates the `Wallet` tag so the balance + ledger refetch.
 */
export const walletApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getWallet: build.query<WalletOut, void>({
      query: () => ({ url: '/wallet' }),
      providesTags: ['Wallet'],
    }),
    getTransactions: build.query<WalletTransactionOut[], void>({
      query: () => ({ url: '/wallet/transactions' }),
      providesTags: ['Wallet'],
    }),
    fundWallet: build.mutation<TransactionOut, { amountCents: number; idempotencyKey?: string }>({
      query: ({ amountCents, idempotencyKey }) => ({
        url: '/wallet/fund',
        method: 'POST',
        headers: { 'Idempotency-Key': idem(idempotencyKey) },
        body: { amount_cents: amountCents },
      }),
      invalidatesTags: ['Wallet'],
    }),
    transferToEgm: build.mutation<
      TransactionOut,
      { amountCents: number; egmId: string; idempotencyKey?: string }
    >({
      query: ({ amountCents, egmId, idempotencyKey }) => ({
        url: '/wallet/transfer',
        method: 'POST',
        headers: { 'Idempotency-Key': idem(idempotencyKey) },
        body: { amount_cents: amountCents, egm_id: egmId },
      }),
      invalidatesTags: ['Wallet'],
    }),
    cashout: build.mutation<TransactionOut, { amountCents: number; idempotencyKey?: string }>({
      query: ({ amountCents, idempotencyKey }) => ({
        url: '/wallet/cashout',
        method: 'POST',
        headers: { 'Idempotency-Key': idem(idempotencyKey) },
        body: { amount_cents: amountCents },
      }),
      invalidatesTags: ['Wallet'],
    }),
    pairEgm: build.mutation<EgmPairOut, { egmId: string }>({
      query: ({ egmId }) => ({
        url: '/egm/pair',
        method: 'POST',
        body: { egm_id: egmId },
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetWalletQuery,
  useGetTransactionsQuery,
  useFundWalletMutation,
  useTransferToEgmMutation,
  useCashoutMutation,
  usePairEgmMutation,
} = walletApi;
