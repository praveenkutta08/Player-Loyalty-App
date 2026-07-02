import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { prefetchConciergeBrief } from '../src/features/concierge/prefetch';
import { buildSegments, initialSegment } from '../src/features/offers/segments';
import { ThemeProvider } from '../src/theme/ThemeProvider';

import type { ConciergeEnvelope } from '../src/features/concierge/types';

// ---------------------------------------------------------------- shared mocks
const mockFlags: Record<string, boolean> = { concierge: true, cardless: true };
jest.mock('../src/app/providers/FeatureProvider', () => ({
  useFeature: (flag: string) => mockFlags[flag] === true,
  useFeatures: () => ({
    flags: mockFlags,
    isEnabled: (flag: string) => mockFlags[flag] === true,
  }),
}));

jest.mock('../src/app/manifest/ManifestProvider', () => ({
  useManifest: () => ({
    manifest: { name: 'Demo Casino', concierge: { personaName: 'Aria', accentToken: 'gold' } },
    status: 'ready',
    refetch: () => {},
  }),
}));

const mockAskTrigger = jest.fn();
const mockConsentTrigger = jest.fn();
let mockBrief: ConciergeEnvelope | undefined;

jest.mock('../src/features/concierge/conciergeApi', () => ({
  conciergeApi: { util: { prefetch: (...args: unknown[]) => ({ type: 'prefetch', args }) } },
  useGetBriefQuery: () => ({ data: mockBrief, isLoading: false }),
  useGetConciergeOffersQuery: () => ({ data: undefined, isLoading: false }),
  usePlanVisitMutation: () => [jest.fn(), { data: undefined, isLoading: false }],
  useAskConciergeMutation: () => [
    (body: { question: string }) => {
      mockAskTrigger(body);
      return { unwrap: () => Promise.resolve(mockBrief) };
    },
    { isLoading: false },
  ],
  useSetConciergeConsentMutation: () => [
    (body: unknown) => {
      mockConsentTrigger(body);
      return { unwrap: () => Promise.resolve({ concierge_consent: true, has_home_origin: true }) };
    },
    { isLoading: false },
  ],
}));

jest.mock('../src/features/account/accountApi', () => ({
  useGetAccountMeQuery: () => ({
    data: { email: 'alice@demo.com', tier: 'gold', points: 1200, segment: null },
  }),
}));

jest.mock('../src/features/offers/offersApi', () => ({
  useGetOffersQuery: () => ({
    data: [{ id: 'o1', kind: 'offer', title: 'Static Featured', status: 'published' }],
  }),
  useGetPromotionsQuery: () => ({ data: [] }),
}));

// Safe as top-level imports: babel-jest hoists the jest.mock() factories above all imports.
// eslint-disable-next-line import/order
import { AskAIScreen } from '../src/features/concierge/AskAIScreen';
// eslint-disable-next-line import/order
import { ConsentPrompt } from '../src/features/concierge/ConsentPrompt';
// eslint-disable-next-line import/order
import { HomeScreen } from '../src/features/home/HomeScreen';

const BRIEF: ConciergeEnvelope = {
  use_case: 'brief',
  verdict: 'Great day to visit.',
  fit_score: 82,
  confidence: 'high',
  reasons: [],
  signals: [{ label: 'Weather', value: 'Clear 31°C', delta: null, source: 'weather-mcp' }],
  sources: ['player-mcp'],
  degraded: [],
  cta: { label: 'Plan my visit', action: 'concierge.plan' },
  disclaimer: 'Recommendations are advisory.',
  generated_at: '2026-07-02T12:00:00Z',
  cache_ttl_s: 300,
};

const nav = { navigate: jest.fn() } as never;

function wrap(node: React.ReactElement) {
  return render(<ThemeProvider initialScheme="dark">{node}</ThemeProvider>);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFlags.concierge = true;
  mockBrief = BRIEF;
});

// ---------------------------------------------------------------- flag fallback (Home)
describe('Home concierge slot', () => {
  it('renders the concierge hero + context strip + Ask entry when the flag is on', () => {
    wrap(<HomeScreen navigation={nav} route={{ key: 'h', name: 'Home' } as never} />);
    expect(screen.getByTestId('reco-hero')).toBeOnTheScreen();
    expect(screen.getByTestId('context-strip')).toBeOnTheScreen();
    expect(screen.getByTestId('ask-entry')).toBeOnTheScreen();
    expect(screen.queryByTestId('featured-offer')).toBeNull(); // never both surfaces
  });

  it('falls back to the static featured offer when the flag is off (no dead ends)', () => {
    mockFlags.concierge = false;
    mockBrief = undefined;
    wrap(<HomeScreen navigation={nav} route={{ key: 'h', name: 'Home' } as never} />);
    expect(screen.queryByTestId('reco-hero')).toBeNull();
    expect(screen.getByTestId('featured-offer')).toBeOnTheScreen();
    expect(screen.getByText('Static Featured')).toBeOnTheScreen();
  });

  it('keeps the static fallback while the brief has not landed yet (no spinner)', () => {
    mockBrief = undefined; // flag on, cache still empty
    wrap(<HomeScreen navigation={nav} route={{ key: 'h', name: 'Home' } as never} />);
    expect(screen.queryByTestId('reco-hero')).toBeNull();
    expect(screen.getByTestId('featured-offer')).toBeOnTheScreen();
  });
});

// ---------------------------------------------------------------- prefetch path
describe('brief prefetch', () => {
  it('dispatches prefetch thunks only when the concierge flag is on', () => {
    const dispatch = jest.fn();
    expect(prefetchConciergeBrief(dispatch as never, false)).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
    expect(prefetchConciergeBrief(dispatch as never, true)).toBe(true);
    expect(dispatch).toHaveBeenCalledTimes(2); // brief + ranked offers
  });
});

// ---------------------------------------------------------------- consent flow
describe('consent flow', () => {
  it('grant stores consent + a home origin; decline sends granted=false', async () => {
    const onDone = jest.fn();
    wrap(<ConsentPrompt onDone={onDone} />);
    fireEvent.press(screen.getByTestId('consent-grant'));
    await Promise.resolve();
    expect(mockConsentTrigger).toHaveBeenCalledWith(
      expect.objectContaining({
        granted: true,
        home_origin: expect.objectContaining({ lat: expect.any(Number) }),
      }),
    );
    expect(onDone).toHaveBeenCalledWith(true);

    fireEvent.press(screen.getByTestId('consent-decline'));
    await Promise.resolve();
    expect(mockConsentTrigger).toHaveBeenLastCalledWith({ granted: false });
  });

  it('Ask AI surfaces the consent prompt when travel context is degraded', () => {
    mockBrief = {
      ...BRIEF,
      degraded: ['maps.get_travel_time'],
      reasons: [
        {
          code: 'travel_fit_missing',
          chip: 'Add your home location',
          detail: 'No stored origin.',
          source: 'maps-mcp',
        },
      ],
    };
    wrap(<AskAIScreen />);
    expect(screen.getByTestId('consent-prompt')).toBeOnTheScreen();
  });
});

// ---------------------------------------------------------------- ask screen
describe('Ask AI', () => {
  it('suggestion chips submit the question to /concierge/ask', () => {
    wrap(<AskAIScreen />);
    expect(screen.queryByTestId('consent-prompt')).toBeNull(); // nothing degraded
    fireEvent.press(screen.getAllByTestId('ask-suggestion')[0]);
    expect(mockAskTrigger).toHaveBeenCalledWith({
      question: 'Is it worth driving in this weekend?',
    });
  });
});

// ---------------------------------------------------------------- segments (For You)
describe('offers segments', () => {
  it('leads with For You only when concierge is enabled', () => {
    expect(buildSegments(true).map((s) => s.key)).toEqual([
      'foryou',
      'offers',
      'promotions',
      'rewards',
    ]);
    expect(buildSegments(false).map((s) => s.key)).toEqual(['offers', 'promotions', 'rewards']);
  });

  it('picks the initial segment with graceful foryou degradation', () => {
    expect(initialSegment(undefined, true)).toBe('foryou');
    expect(initialSegment(undefined, false)).toBe('offers');
    expect(initialSegment('rewards', true)).toBe('rewards');
    expect(initialSegment('foryou', false)).toBe('offers'); // deep link, flag off — no dead end
  });
});
