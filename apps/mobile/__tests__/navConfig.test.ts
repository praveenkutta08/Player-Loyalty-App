import { DEFAULT_NAV, resolveTabs } from '../src/app/navigation/navConfig';

import type { ManifestNavigation } from '@repo/shared-types';

const allEnabled = () => true;

describe('resolveTabs (config-driven nav)', () => {
  it('falls back to Option B (5 tabs) when the manifest has no navigation', () => {
    const tabs = resolveTabs(undefined, allEnabled);
    expect(tabs.map((t) => t.route)).toEqual(['Home', 'Offers', 'Play', 'Account', 'More']);
    expect(tabs.find((t) => t.route === 'Play')?.isCenter).toBe(true);
  });

  it('uses manifest labels (localized) and marks the center action', () => {
    const nav: ManifestNavigation = {
      tabs: [
        { key: 'home', label: 'Inicio', icon: 'home' },
        { key: 'play', label: 'Jugar', icon: 'scan-line' },
      ],
      centerAction: { key: 'play', label: 'Jugar', icon: 'scan-line' },
    };
    const tabs = resolveTabs(nav, allEnabled);
    expect(tabs.map((t) => t.label)).toEqual(['Inicio', 'Jugar']);
    expect(tabs.find((t) => t.route === 'Play')?.isCenter).toBe(true);
  });

  it('drops tabs whose feature flag is disabled', () => {
    const nav: ManifestNavigation = {
      tabs: [
        { key: 'home', label: 'Home', icon: 'home' },
        { key: 'play', label: 'Play', icon: 'scan-line', requiresFlag: 'cashless' },
      ],
    };
    const enabled = (flag: string) => flag !== 'cashless';
    expect(resolveTabs(nav, enabled).map((t) => t.route)).toEqual(['Home']);
  });

  it('drops unknown keys and de-dupes routes', () => {
    const nav: ManifestNavigation = {
      tabs: [
        { key: 'home', label: 'Home', icon: 'home' },
        { key: 'mystery', label: 'Nope', icon: 'x' },
        { key: 'scan', label: 'Scan', icon: 'scan' },
        { key: 'play', label: 'Play', icon: 'play' }, // same route as 'scan' -> deduped
      ],
    };
    expect(resolveTabs(nav, allEnabled).map((t) => t.route)).toEqual(['Home', 'Play']);
  });

  it('default nav gates the center action on the cashless flag', () => {
    expect(DEFAULT_NAV.centerAction?.requiresFlag).toBe('cashless');
    expect(DEFAULT_NAV.centerAction?.fallback).toBe('wallet');
  });
});
