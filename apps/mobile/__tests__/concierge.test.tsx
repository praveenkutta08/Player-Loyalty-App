import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { normalizeManifest } from '../src/app/manifest/normalize';
import {
  AIAnswerCard,
  ContextStrip,
  RankedOfferCard,
  RecoHero,
} from '../src/features/concierge/components';
import { ThemeProvider } from '../src/theme/ThemeProvider';

import type { ManifestOut } from '../src/app/manifest/normalize';
import type { ConciergeEnvelope, RankedOffer } from '../src/features/concierge/types';

// The kit resolves persona/accent from the manifest; stub the provider hook (golden rule #5 —
// values flow from the manifest, not from hardcoded brand constants).
jest.mock('../src/app/manifest/ManifestProvider', () => ({
  useManifest: () => ({
    manifest: {
      concierge: { personaName: 'Aria', tone: 'warm', accentToken: 'gold' },
    },
    status: 'ready',
    refetch: () => {},
  }),
}));

const ENVELOPE: ConciergeEnvelope = {
  use_case: 'brief',
  verdict: "It's a great day to visit.",
  fit_score: 82,
  confidence: 'high',
  reasons: [
    {
      code: 'weather_good',
      chip: 'Clear, 31°C',
      detail: 'Precipitation 5%.',
      source: 'weather-mcp',
    },
  ],
  signals: [
    { label: 'Weather', value: 'Clear 31°C', delta: null, source: 'weather-mcp' },
    { label: 'Drive', value: '40 min', delta: '-12 vs usual', source: 'maps-mcp' },
  ],
  sources: ['player-mcp', 'weather-mcp'],
  degraded: [],
  cta: { label: 'Plan my visit', action: 'concierge.plan' },
  disclaimer: 'Recommendations are advisory.',
  generated_at: '2026-07-02T12:00:00Z',
  cache_ttl_s: 300,
};

const NEUTRAL: ConciergeEnvelope = {
  ...ENVELOPE,
  verdict: "Here's what's happening at the resort.",
  fit_score: null,
  reasons: [],
  signals: [],
  sources: [],
  cta: null,
};

function wrap(node: React.ReactElement) {
  return render(<ThemeProvider initialScheme="dark">{node}</ThemeProvider>);
}

describe('RecoHero', () => {
  it('renders verdict, fit score, reason chips and a working CTA', () => {
    const onCta = jest.fn();
    wrap(<RecoHero envelope={ENVELOPE} onCta={onCta} />);
    expect(screen.getByTestId('verdict')).toHaveTextContent("It's a great day to visit.");
    expect(screen.getByTestId('fit-score')).toHaveTextContent('82');
    expect(screen.getByText('Clear, 31°C')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('hero-cta'));
    expect(onCta).toHaveBeenCalledWith('concierge.plan');
    expect(screen.queryByTestId('degraded-note')).toBeNull();
  });

  it('neutral (RG/suppressed) variant shows no score, no chips, no CTA', () => {
    wrap(<RecoHero envelope={NEUTRAL} onCta={jest.fn()} />);
    expect(screen.getByTestId('verdict')).toBeOnTheScreen();
    expect(screen.queryByTestId('fit-score')).toBeNull();
    expect(screen.queryByTestId('hero-cta')).toBeNull();
    expect(screen.queryByText('Clear, 31°C')).toBeNull();
  });

  it('degraded variant surfaces the missing-source notice', () => {
    wrap(
      <RecoHero envelope={{ ...ENVELOPE, degraded: ['maps.get_travel_time'] }} onCta={jest.fn()} />,
    );
    expect(screen.getByTestId('degraded-note')).toBeOnTheScreen();
  });
});

describe('AIAnswerCard', () => {
  it('renders headline + signal grid + source chips', () => {
    wrap(<AIAnswerCard envelope={ENVELOPE} />);
    expect(screen.getByTestId('answer-headline')).toBeOnTheScreen();
    expect(screen.getByTestId('signal-weather')).toBeOnTheScreen();
    expect(screen.getByTestId('signal-drive')).toHaveTextContent(/-12 vs usual/);
    expect(screen.getByText('Profile')).toBeOnTheScreen(); // player-mcp source chip label
    expect(screen.queryByTestId('answer-degraded')).toBeNull();
  });

  it('names unreachable sources explicitly', () => {
    wrap(<AIAnswerCard envelope={{ ...ENVELOPE, degraded: ['weather.get_forecast'] }} />);
    expect(screen.getByTestId('answer-degraded')).toHaveTextContent(/weather\.get_forecast/);
  });
});

describe('RankedOfferCard + ContextStrip', () => {
  const OFFER: RankedOffer = {
    offer_id: 'o1',
    title: 'Steakhouse Credit',
    kind: 'offer',
    score: 0.85,
    rank: 1,
    why_you: [
      {
        code: 'segment_match',
        chip: 'Picked for vip',
        detail: 'Targets you.',
        source: 'offers-mcp',
      },
    ],
  };

  it('shows rank, title and why-you pills; press fires', () => {
    const onPress = jest.fn();
    wrap(<RankedOfferCard offer={OFFER} onPress={onPress} />);
    expect(screen.getByText('#1')).toBeOnTheScreen();
    expect(screen.getByText('Steakhouse Credit')).toBeOnTheScreen();
    expect(screen.getByText('Picked for vip')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('ranked-offer-1'));
    expect(onPress).toHaveBeenCalled();
  });

  it('ContextStrip renders signals and hides when empty', () => {
    wrap(<ContextStrip signals={ENVELOPE.signals} />);
    expect(screen.getByTestId('context-strip')).toBeOnTheScreen();
    const { queryByTestId } = wrap(<ContextStrip signals={[]} />);
    expect(queryByTestId('context-strip')).toBeNull();
  });
});

describe('manifest concierge normalization', () => {
  const RAW = {
    version: 3,
    tenant_id: 't1',
    tenant_slug: 'demo',
    name: 'Demo',
    theme: {},
    feature_flags: { concierge: true },
    endpoints: {},
    navigation: null,
    updated_at: null,
  } as unknown as ManifestOut;

  it('camelCases the persona block', () => {
    const resolved = normalizeManifest({
      ...RAW,
      concierge: { persona_name: 'Ruby', tone: 'playful', accent_token: 'primary' },
    } as ManifestOut);
    expect(resolved.concierge).toEqual({
      personaName: 'Ruby',
      tone: 'playful',
      accentToken: 'primary',
    });
  });

  it('is undefined when the tenant has no concierge config', () => {
    expect(normalizeManifest(RAW).concierge).toBeUndefined();
  });
});
