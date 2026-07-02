import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

/**
 * UI-facing session state. Real authentication (tokens, permissions) is layered on in P3.2; for
 * the shell we track the active role scope (Platform vs Casino) and the acting tenant, which the
 * topbar role switch and sidebar tenant switcher drive.
 */
export type RoleScope = 'platform' | 'casino';

export interface TenantOption {
  id: string;
  name: string;
  subtitle: string;
}

interface SessionState {
  scope: RoleScope;
  activeTenantId: string;
  tenants: TenantOption[];
}

const DEMO_TENANTS: TenantOption[] = [
  { id: 'demo-casino', name: 'Demo Casino', subtitle: 'Las Vegas, NV · Live' },
  { id: 'aurora-bay', name: 'Aurora Bay Resort', subtitle: 'Atlantic City, NJ · Live' },
  { id: 'silver-peak', name: 'Silver Peak Casino', subtitle: 'Reno, NV · Draft' },
];

const initialState: SessionState = {
  scope: 'platform',
  activeTenantId: DEMO_TENANTS[0]!.id,
  tenants: DEMO_TENANTS,
};

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    setScope(state, action: PayloadAction<RoleScope>) {
      state.scope = action.payload;
    },
    setActiveTenant(state, action: PayloadAction<string>) {
      state.activeTenantId = action.payload;
    },
  },
});

export const { setScope, setActiveTenant } = sessionSlice.actions;
export default sessionSlice.reducer;
