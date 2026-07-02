import { DEFAULT_NAV, MIN_VIABLE_TABS, resolveTabs } from '../src/app/navigation/navConfig';

import type { ManifestNavigation } from '@repo/shared-types';

const allEnabled = () => true;
const cashlessOff = (flag: string) => flag !== 'cashless';

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
        { key: 'account', label: 'Cuenta', icon: 'user' },
      ],
      centerAction: { key: 'play', label: 'Jugar', icon: 'scan-line' },
    };
    const tabs = resolveTabs(nav, allEnabled);
    expect(tabs.map((t) => t.label)).toEqual(['Inicio', 'Jugar', 'Cuenta']);
    expect(tabs.find((t) => t.route === 'Play')?.isCenter).toBe(true);
  });

  it('drops tabs whose feature flag is disabled (keeping a viable bar)', () => {
    const nav: ManifestNavigation = {
      tabs: [
        { key: 'home', label: 'Home', icon: 'home' },
        { key: 'offers', label: 'Offers', icon: 'gift' },
        { key: 'account', label: 'Account', icon: 'user' },
        { key: 'play', label: 'Play', icon: 'scan-line', requiresFlag: 'cashless' },
      ],
    };
    expect(resolveTabs(nav, cashlessOff).map((t) => t.route)).toEqual([
      'Home',
      'Offers',
      'Account',
    ]);
  });

  it('drops unknown keys and de-dupes routes', () => {
    const nav: ManifestNavigation = {
      tabs: [
        { key: 'home', label: 'Home', icon: 'home' },
        { key: 'mystery', label: 'Nope', icon: 'x' },
        { key: 'scan', label: 'Scan', icon: 'scan' },
        { key: 'play', label: 'Play', icon: 'play' }, // same route as 'scan' -> deduped
        { key: 'account', label: 'Account', icon: 'user' },
      ],
    };
    expect(resolveTabs(nav, allEnabled).map((t) => t.route)).toEqual(['Home', 'Play', 'Account']);
  });

  it('default nav declares the cashless-gated center action with a wallet fallback', () => {
    expect(DEFAULT_NAV.centerAction?.requiresFlag).toBe('cashless');
    expect(DEFAULT_NAV.centerAction?.fallback).toBe('wallet');
  });

  // ------------------------------------------------------------------ M15 behavior
  it('cashless off: the center SLOT stays but swaps to the wallet identity', () => {
    const tabs = resolveTabs(undefined, cashlessOff);
    // Same 5-slot Option B structure — the slot is not dropped.
    expect(tabs.map((t) => t.route)).toEqual(['Home', 'Offers', 'Play', 'Account', 'More']);
    const center = tabs.find((t) => t.isCenter);
    expect(center?.route).toBe('Play'); // Play route hosts WalletNavigator
    expect(center?.label).toBe('Wallet'); // ...but presents as Wallet, not Scan/Play
  });

  it('cashless on: the center action keeps its Scan/Play identity', () => {
    const center = resolveTabs(undefined, allEnabled).find((t) => t.isCenter);
    expect(center?.label).toBe('Scan/Play');
  });

  it('a degenerate partial manifest falls back to full Option B', () => {
    const oneTab: ManifestNavigation = { tabs: [{ key: 'home', label: 'Home', icon: 'home' }] };
    const tabs = resolveTabs(oneTab, allEnabled);
    expect(tabs.map((t) => t.route)).toEqual(['Home', 'Offers', 'Play', 'Account', 'More']);
    expect(tabs.length).toBeGreaterThanOrEqual(MIN_VIABLE_TABS);
  });

  it('a manifest without Home falls back to full Option B', () => {
    const noHome: ManifestNavigation = {
      tabs: [
        { key: 'offers', label: 'Offers', icon: 'gift' },
        { key: 'account', label: 'Account', icon: 'user' },
        { key: 'more', label: 'More', icon: 'menu' },
      ],
    };
    const tabs = resolveTabs(noHome, allEnabled);
    expect(tabs.map((t) => t.route)).toEqual(['Home', 'Offers', 'Play', 'Account', 'More']);
  });
});
