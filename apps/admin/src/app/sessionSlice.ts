import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

/**
 * UI-facing session state: the active role scope (Platform vs Casino) and the acting tenant that
 * the topbar role switch + sidebar tenant switcher drive.
 *
 * No demo tenants (M12): `activeTenantId` starts null so NO X-Tenant is sent until real tenants
 * load from the API (see authBridge.getActingTenant), and `tenants` is populated from the server
 * by the Sidebar rather than shipped as a fake list.
 */
export type RoleScope = 'platform' | 'casino';

export interface TenantOption {
  id: string;
  name: string;
  subtitle: string;
}

interface SessionState {
  scope: RoleScope;
  activeTenantId: string | null;
  tenants: TenantOption[];
}

const initialState: SessionState = {
  scope: 'platform',
  activeTenantId: null,
  tenants: [],
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
    /** Replace the tenant list with the server-scoped tenants (Sidebar, once /tenants loads). */
    setTenants(state, action: PayloadAction<TenantOption[]>) {
      state.tenants = action.payload;
    },
  },
});

export const { setScope, setActiveTenant, setTenants } = sessionSlice.actions;
export default sessionSlice.reducer;
