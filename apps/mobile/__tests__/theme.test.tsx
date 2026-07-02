import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

import { ThemeProvider, useTheme } from '../src/theme/ThemeProvider';
import { DEFAULT_THEME } from '../src/theme/tokens';

function Probe(): React.JSX.Element {
  const theme = useTheme();
  const body = theme.typography('body');
  return (
    <>
      <Text testID="scheme">{theme.scheme}</Text>
      <Text testID="gold">{theme.colors.brand.gold}</Text>
      <Text testID="bg">{theme.colors.bg.base}</Text>
      <Text testID="bodySize">{String(body.fontSize)}</Text>
    </>
  );
}

describe('theme resolution', () => {
  it('exposes dark-scheme tokens from the default theme', () => {
    render(
      <ThemeProvider initialScheme="dark">
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('scheme')).toHaveTextContent('dark');
    expect(screen.getByTestId('gold')).toHaveTextContent(DEFAULT_THEME.color.brand.gold);
    expect(screen.getByTestId('bg')).toHaveTextContent(DEFAULT_THEME.color.bg.base);
    expect(screen.getByTestId('bodySize')).toHaveTextContent('13');
  });

  it('switches to light-scheme palette', () => {
    render(
      <ThemeProvider initialScheme="light">
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('gold')).toHaveTextContent(DEFAULT_THEME.colorLight.brand.gold);
    expect(screen.getByTestId('bg')).toHaveTextContent(DEFAULT_THEME.colorLight.bg.base);
  });
});
