import { beforeEach, describe, expect, it } from 'vitest';

import { tokenStore } from './tokenStore';

// H5 — the admin access token must live in memory only, never in a place an XSS payload can read
// back after the fact (localStorage/sessionStorage). The refresh token is an httpOnly cookie the
// JS never touches, so there is nothing to assert here about it.
describe('admin tokenStore (H5)', () => {
  beforeEach(() => {
    tokenStore.clear();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('keeps the access token in memory, not in web storage', () => {
    tokenStore.setAccess('access-abc');

    expect(tokenStore.getAccess()).toBe('access-abc');
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    // The raw token must not appear anywhere in serialized web storage.
    expect(JSON.stringify(localStorage)).not.toContain('access-abc');
  });

  it('clear() drops the in-memory token', () => {
    tokenStore.setAccess('access-abc');
    tokenStore.clear();
    expect(tokenStore.getAccess()).toBeNull();
  });
});
