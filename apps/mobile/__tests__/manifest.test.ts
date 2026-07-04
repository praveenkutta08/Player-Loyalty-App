import { normalizeManifest, resolveApiBaseUrl } from '../src/app/manifest/normalize';
import { deepMerge } from '../src/lib/deepMerge';
import { DEFAULT_THEME } from '../src/theme/tokens';

// A representative raw manifest (snake_case, partial theme) like the backend returns.
const RAW = {
  version: 3,
  tenant_id: 'tenant-uuid',
  tenant_slug: 'demo-casino',
  name: 'Demo Casino',
  theme: { color: { brand: { gold: '#123456' } } },
  feature_flags: { cardless: true, geofencing: false, digital_key: true },
  endpoints: { api_base_url: 'http://localhost:8000/api/v1' },
  navigation: {
    tabs: [{ key: 'home', label: 'Home', icon: 'home' }],
    center_action: {
      key: 'play',
      label: 'Play',
      icon: 'dice',
      requires_flag: 'cardless',
      fallback: 'wallet',
    },
    globals: { show_notifications: true, show_support: false },
  },
  updated_at: '2026-07-02T00:00:00Z',
} as never;

describe('deepMerge', () => {
  it('overlays partial values without dropping the base tree', () => {
    const merged = deepMerge<Record<string, unknown>>({ a: { x: 1, y: 2 }, b: 3 }, { a: { y: 9 } });
    expect(merged).toEqual({ a: { x: 1, y: 9 }, b: 3 });
  });
});

describe('normalizeManifest', () => {
  const m = normalizeManifest(RAW);

  it('merges the partial theme over the defaults', () => {
    expect(m.theme.color.brand.gold).toBe('#123456'); // overridden
    expect(m.theme.color.bg.base).toBe(DEFAULT_THEME.color.bg.base); // preserved default
    expect(m.theme.typography.scale.body.size).toBe(15); // untouched default subtree (obsidian body = 15)
  });

  it('camelCases fields and coerces flags to booleans', () => {
    expect(m.tenantId).toBe('tenant-uuid');
    expect(m.featureFlags).toEqual({ cardless: true, geofencing: false, digital_key: true });
  });

  it('normalizes the navigation block', () => {
    expect(m.navigation?.tabs[0]).toEqual({
      key: 'home',
      label: 'Home',
      icon: 'home',
      requiresFlag: undefined,
    });
    expect(m.navigation?.centerAction).toMatchObject({
      key: 'play',
      requiresFlag: 'cardless',
      fallback: 'wallet',
    });
    expect(m.navigation?.globals).toEqual({
      showNotifications: true,
      showSearch: false,
      showSupport: false,
    });
  });
});

describe('resolveApiBaseUrl', () => {
  it('passes through non-localhost urls', () => {
    expect(resolveApiBaseUrl('https://api.example.com/api/v1')).toBe(
      'https://api.example.com/api/v1',
    );
  });
});
