import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { Button, ThemedText } from '../src/components';
import { ThemeProvider } from '../src/theme/ThemeProvider';

function wrap(node: React.ReactElement): React.ReactElement {
  return <ThemeProvider initialScheme="dark">{node}</ThemeProvider>;
}

describe('base components', () => {
  it('renders themed text', () => {
    render(wrap(<ThemedText variant="h1">Welcome</ThemedText>));
    expect(screen.getByText('Welcome')).toBeOnTheScreen();
  });

  it('fires Button onPress and respects disabled', () => {
    const onPress = jest.fn();
    const { rerender } = render(
      wrap(<Button label="Play" onPress={onPress} testID="btn" />),
    );
    fireEvent.press(screen.getByTestId('btn'));
    expect(onPress).toHaveBeenCalledTimes(1);

    rerender(wrap(<Button label="Play" onPress={onPress} disabled testID="btn" />));
    fireEvent.press(screen.getByTestId('btn'));
    expect(onPress).toHaveBeenCalledTimes(1); // still 1 — disabled swallows the press
  });
});
