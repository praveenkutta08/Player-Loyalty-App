import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import {
  CapsLabel,
  GlassCard,
  HairlineRow,
  ImmersiveCard,
  Kicker,
  PillButton,
  PillButtonRow,
  ThemedText,
} from '../src/components';
import { withAlpha } from '../src/theme/color';
import { ThemeProvider } from '../src/theme/ThemeProvider';

function wrap(node: React.ReactElement): React.ReactElement {
  return <ThemeProvider initialScheme="dark">{node}</ThemeProvider>;
}

describe('obsidian glass UI kit (RS0)', () => {
  it('renders a GlassCard with its children', () => {
    render(
      wrap(
        <GlassCard testID="glass">
          <ThemedText>Contents</ThemedText>
        </GlassCard>,
      ),
    );
    expect(screen.getByTestId('glass')).toBeOnTheScreen();
    expect(screen.getByText('Contents')).toBeOnTheScreen();
  });

  it('renders an ImmersiveCard title, kicker and CTA row', () => {
    render(
      wrap(
        <ImmersiveCard
          image={{ uri: 'https://example.com/suite.jpg' }}
          kicker="ONYX EXCLUSIVE"
          title="The Obsidian Suite"
          actions={
            <PillButtonRow>
              <PillButton label="CLAIM" variant="accent" />
              <PillButton label="VIEW DETAILS" variant="secondary" />
            </PillButtonRow>
          }
        />,
      ),
    );
    expect(screen.getByText('The Obsidian Suite')).toBeOnTheScreen();
    expect(screen.getByText('ONYX EXCLUSIVE')).toBeOnTheScreen();
    expect(screen.getByText('CLAIM')).toBeOnTheScreen();
  });

  it('fires PillButton onPress and swallows it when disabled', () => {
    const onPress = jest.fn();
    const { rerender } = render(
      wrap(<PillButton label="IDENTIFY" onPress={onPress} testID="pill" />),
    );
    fireEvent.press(screen.getByTestId('pill'));
    expect(onPress).toHaveBeenCalledTimes(1);

    rerender(wrap(<PillButton label="IDENTIFY" onPress={onPress} disabled testID="pill" />));
    fireEvent.press(screen.getByTestId('pill'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders caps labels, kickers and a pressable hairline row', () => {
    const onPress = jest.fn();
    render(
      wrap(
        <>
          <CapsLabel>Current Balance</CapsLabel>
          <Kicker>Limited Time</Kicker>
          <HairlineRow onPress={onPress} testID="row">
            <ThemedText>Deposit</ThemedText>
          </HairlineRow>
        </>,
      ),
    );
    fireEvent.press(screen.getByTestId('row'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Deposit')).toBeOnTheScreen();
  });
});

describe('withAlpha', () => {
  it('converts hex to rgba and passes through on bad input', () => {
    expect(withAlpha('#5E5CE6', 0.5)).toBe('rgba(94, 92, 230, 0.5)');
    expect(withAlpha('#050505', 0)).toBe('rgba(5, 5, 5, 0)');
    expect(withAlpha('nonsense', 0.5)).toBe('nonsense');
  });
});
