import { configureStore } from '@reduxjs/toolkit';
import { baseApi } from '@repo/api-client';
import { useDispatch, useSelector } from 'react-redux';

import sessionReducer from './sessionSlice';

import type { TypedUseSelectorHook } from 'react-redux';

import authReducer from '@/auth/authSlice';

// Single store shared across the console. Domain endpoints are injected onto `baseApi`
// (GOLDEN RULE #7) so the one reducer path handles all backend data + caching.
export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
    auth: authReducer,
    session: sessionReducer,
  },
  middleware: (getDefault) => getDefault().concat(baseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
