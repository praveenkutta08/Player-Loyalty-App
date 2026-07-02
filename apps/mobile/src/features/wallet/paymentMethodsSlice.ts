import { createSlice } from '@reduxjs/toolkit';

import type { PayloadAction } from '@reduxjs/toolkit';

/**
 * Tokenized payment methods (S10) — a mock, session-local store standing in for the PaymentPort
 * vault. Only the display metadata (brand + last four + expiry) lives here; a real integration
 * tokenizes the card server-side and never stores the PAN on device.
 */
export interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  /** MM/YY, display only. */
  exp: string;
}

export interface PaymentMethodsState {
  methods: PaymentMethod[];
}

const initialState: PaymentMethodsState = {
  methods: [{ id: 'pm_seed_visa', brand: 'Visa', last4: '4242', exp: '08/28' }],
};

const paymentMethodsSlice = createSlice({
  name: 'paymentMethods',
  initialState,
  reducers: {
    addPaymentMethod(state, action: PayloadAction<PaymentMethod>) {
      state.methods.push(action.payload);
    },
    removePaymentMethod(state, action: PayloadAction<string>) {
      state.methods = state.methods.filter((m) => m.id !== action.payload);
    },
  },
});

export const { addPaymentMethod, removePaymentMethod } = paymentMethodsSlice.actions;
export default paymentMethodsSlice.reducer;
