import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { OfferCard } from '../src/features/offers/OfferCard';
import redeemedReducer, { markRedeemed } from '../src/features/offers/redeemedSlice';
import { ThemeProvider } from '../src/theme/ThemeProvider';

import type { OfferOut } from '../src/features/offers/offersApi';

const OFFER: OfferOut = {
  id: 'off-1',
  tenant_id: 't-1',
  kind: 'offer',
  title: 'Welcome Offer',
  description: 'Welcome bonus',
  image_url: null,
  segment: 'all',
  start_at: null,
  end_at: null,
  status: 'published',
  terms: null,
};

function wrap(node: React.ReactElement): React.ReactElement {
  return <ThemeProvider initialScheme="dark">{node}</ThemeProvider>;
}

describe('redeemedSlice', () => {
  it('marks an offer redeemed once (idempotent)', () => {
    let state = redeemedReducer(undefined, markRedeemed('off-1'));
    expect(state.offerIds).toEqual(['off-1']);
    state = redeemedReducer(state, markRedeemed('off-1'));
    expect(state.offerIds).toEqual(['off-1']); // no duplicate
    state = redeemedReducer(state, markRedeemed('off-2'));
    expect(state.offerIds).toEqual(['off-1', 'off-2']);
  });
});

describe('OfferCard', () => {
  it('renders the offer title and blurb', () => {
    render(wrap(<OfferCard offer={OFFER} />));
    expect(screen.getByText('Welcome Offer')).toBeOnTheScreen();
    expect(screen.getByText('Welcome bonus')).toBeOnTheScreen();
  });

  it('shows a Redeemed pill when redeemed', () => {
    render(wrap(<OfferCard offer={OFFER} redeemed />));
    expect(screen.getByText('Redeemed')).toBeOnTheScreen();
  });
});
