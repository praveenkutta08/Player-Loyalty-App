import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { NavBarVisual } from '../src/app/navigation/NavBarVisual';
import { DEFAULT_NAV, resolveTabs } from '../src/app/navigation/navConfig';
import {
  editorialBottomPadding,
  pillBottomOffset,
  resolveNavStyle,
} from '../src/app/navigation/navStyles';
import { ThemeProvider } from '../src/theme/ThemeProvider';

import type { NavStyleKey } from '../src/app/navigation/navStyles';

function bar(
  styleKey: NavStyleKey,
  opts: { cashless?: boolean; onPress?: (r: string) => void; scheme?: 'dark' | 'light' } = {},
) {
  const tabs = resolveTabs(DEFAULT_NAV, (flag) =>
    flag === 'cashless' ? (opts.cashless ?? true) : true,
  );
  return render(
    <ThemeProvider initialScheme={opts.scheme ?? 'dark'}>
      <NavBarVisual
        styleKey={styleKey}
        tabs={tabs}
        activeRoute="Home"
        onPress={opts.onPress ?? jest.fn()}
        safeAreaBottom={34}
      />
    </ThemeProvider>,
  );
}

describe('resolveNavStyle (read-side fallback)', () => {
  it('accepts the two known styles and falls back to editorial on anything else', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(resolveNavStyle('floatingPill')).toBe('floatingPill');
    expect(resolveNavStyle('editorial')).toBe('editorial');
    expect(resolveNavStyle('adaptive')).toBe('editorial'); // deferred style, unknown here
    expect(resolveNavStyle(undefined)).toBe('editorial');
    expect(warn).toHaveBeenCalledTimes(1); // unknown value warned; absent value silent
    warn.mockRestore();
  });
});

describe('safe-area presets (notch / gesture-nav)', () => {
  it('editorial absorbs the inset as bottom padding; the pill floats above it', () => {
    expect(editorialBottomPadding(34)).toBe(34); // gesture-nav iPhone
    expect(editorialBottomPadding(0)).toBe(0); // buttoned Android
    expect(pillBottomOffset(34)).toBe(42); // max(34,12)+8
    expect(pillBottomOffset(0)).toBe(20); // max(0,12)+8 — never glued to the edge
  });
});

describe('NavBarVisual — both skins over the SAME resolved tabs', () => {
  it.each(['editorial', 'floatingPill'] as const)(
    '%s renders all Option B slots and navigates on press',
    (styleKey) => {
      const onPress = jest.fn();
      bar(styleKey, { onPress });
      for (const route of ['Home', 'Offers', 'Play', 'Account', 'More']) {
        expect(screen.getByTestId(`nav-${route}`)).toBeOnTheScreen();
      }
      fireEvent.press(screen.getByTestId('nav-Offers'));
      expect(onPress).toHaveBeenCalledWith('Offers');
    },
  );

  it.each(['editorial', 'floatingPill'] as const)(
    '%s keeps the emphasized center Scan/Play action working',
    (styleKey) => {
      const onPress = jest.fn();
      bar(styleKey, { onPress, cashless: true });
      expect(screen.getByTestId('nav-center-badge')).toBeOnTheScreen();
      fireEvent.press(screen.getByTestId('nav-Play'));
      expect(onPress).toHaveBeenCalledWith('Play'); // ScanPlayScreen owns the cashless fallback
    },
  );

  it('cashless off: the center slot still routes to Play (wallet fallback downstream)', () => {
    // DEFAULT_NAV's center action requires the cashless flag; with it off the tab remains
    // (structure is untouched) and ScanPlayScreen renders the wallet fallback (P4.14 contract).
    const onPress = jest.fn();
    bar('floatingPill', { onPress, cashless: false });
    expect(screen.getByTestId('nav-Play')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('nav-Play'));
    expect(onPress).toHaveBeenCalledWith('Play');
  });

  it('editorial is label-forward; the pill is icon-forward', () => {
    bar('editorial');
    expect(screen.getByText('Offers')).toBeOnTheScreen(); // labels always visible
    const { queryByText } = bar('floatingPill');
    expect(queryByText('Offers')).toBeNull(); // icon-forward: no labels on the pill
  });
});

describe('snapshots per style × theme', () => {
  it.each([
    ['editorial', 'dark'],
    ['editorial', 'light'],
    ['floatingPill', 'dark'],
    ['floatingPill', 'light'],
  ] as const)('%s × %s', (styleKey, scheme) => {
    const { toJSON } = bar(styleKey, { scheme });
    expect(toJSON()).toMatchSnapshot();
  });
});
