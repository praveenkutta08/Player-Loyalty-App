import { resolveBuildConfig } from '../src/config/buildConfig';

describe('resolveBuildConfig (H6 white-label packaging)', () => {
  it('prefers native flavor/scheme values over env and demo fallbacks', () => {
    const cfg = resolveBuildConfig(
      {
        tenantId: 'native-tenant-uuid',
        tenantSlug: 'aurora-bay',
        apiBaseUrl: 'https://api.aurorabay.example.com/api/v1',
        appName: 'Aurora Bay Casino',
        appVersion: '1.2.3',
      },
      { tenantId: 'env-tenant', devApiHost: 'http://localhost:8000' },
    );
    expect(cfg.tenantId).toBe('native-tenant-uuid');
    expect(cfg.tenantSlug).toBe('aurora-bay');
    expect(cfg.apiBaseUrl).toBe('https://api.aurorabay.example.com/api/v1');
    expect(cfg.appName).toBe('Aurora Bay Casino');
    expect(cfg.appVersion).toBe('1.2.3');
  });

  it('falls through blank native fields (demo flavor) to env, then committed demo values', () => {
    const cfg = resolveBuildConfig(
      { tenantId: '', tenantSlug: 'demo-casino', apiBaseUrl: '', appName: 'Casino Companion' },
      { tenantId: 'env-tenant', devApiHost: 'http://10.0.2.2:8000' },
    );
    expect(cfg.tenantId).toBe('env-tenant');
    expect(cfg.apiBaseUrl).toBe('http://10.0.2.2:8000/api/v1');
    expect(cfg.appName).toBe('Casino Companion');
  });

  it('boots on a fresh checkout with no native module and no env', () => {
    const cfg = resolveBuildConfig({}, {});
    expect(cfg.tenantId).toBe('3e321b81-eae9-4ece-81a1-a6d4c9a3bcfd');
    expect(cfg.tenantSlug).toBe('demo-casino');
    expect(cfg.apiBaseUrl).toBe('http://localhost:8000/api/v1');
    expect(cfg.appVersion).toBe('0.0.1');
  });
});
