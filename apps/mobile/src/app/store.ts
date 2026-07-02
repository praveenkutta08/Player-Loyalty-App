import { configureStore } from '@reduxjs/toolkit';
import { baseApi } from '@repo/api-client';
import { useDispatch, useSelector } from 'react-redux';

import authReducer from '../features/auth/authSlice';
import redeemedReducer from '../features/offers/redeemedSlice';

import type { TypedUseSelectorHook } from 'react-redux';

/**
 * Single Redux store for the mobile app. Domain endpoints are injected onto the shared `baseApi`
 * (GOLDEN RULE #7) so one reducer path handles all backend data + caching. Feature slices (auth,
 * etc.) are added to `reducer` as the app grows.
 */
export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
    auth: authReducer,
    redeemed: redeemedReducer,
  },
  middleware: (getDefault) => getDefault().concat(baseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
