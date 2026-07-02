import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button, Screen, ThemedText } from '../../components';
import { useTheme } from '../../theme/ThemeProvider';

import {
  AIAnswerCard,
  AriaOrb,
  ContextStrip,
  RankedOfferCard,
  RecoHero,
  SignalTile,
  SourceChip,
  WhyYouPill,
} from './components';

import type { ConciergeEnvelope, RankedOffer } from './types';

/**
 * Dev gallery for the concierge kit (P6.5): every component in every state — normal, degraded
 * (missing source), and RG-neutral — rendered purely from manifest tokens. Toggle the app theme
 * in More ▸ Appearance to verify light/dark. Reached from More ▸ Appearance in dev builds.
 */

const FULL: ConciergeEnvelope = {
  use_case: 'brief',
  verdict: "It's a great day to visit — 12 days since your last visit; clear skies.",
  fit_score: 82,
  confidence: 'high',
  reasons: [
    {
      code: 'value_at_risk_high',
      chip: '12 days since your last visit',
      detail: 'You usually visit 3×/month — you are overdue.',
      source: 'player-mcp',
    },
    {
      code: 'weather_good',
      chip: 'Clear, 31°C',
      detail: 'Precipitation chance 5%.',
      source: 'weather-mcp',
    },
    {
      code: 'traffic_light',
      chip: 'Drive is 12 min faster than usual',
      detail: '40 min now vs 52 min typically.',
      source: 'maps-mcp',
    },
  ],
  signals: [
    { label: 'Weather', value: 'Clear 31°C', delta: null, source: 'weather-mcp' },
    { label: 'Drive', value: '40 min', delta: '-12 vs usual', source: 'maps-mcp' },
    { label: 'Tier', value: '500 pts to gold', delta: null, source: 'player-mcp' },
  ],
  sources: ['player-mcp', 'offers-mcp', 'weather-mcp', 'maps-mcp'],
  degraded: [],
  cta: { label: 'Plan my visit', action: 'concierge.plan' },
  disclaimer: 'Recommendations are advisory.',
  generated_at: '2026-07-02T12:00:00Z',
  cache_ttl_s: 300,
};

const DEGRADED: ConciergeEnvelope = {
  ...FULL,
  verdict: "A solid day for a visit — 12 days since your last visit. (Couldn't reach maps.)",
  fit_score: 74,
  confidence: 'medium',
  reasons: [
    FULL.reasons[0],
    {
      code: 'travel_fit_missing',
      chip: 'Add your home location for drive-time insight',
      detail: 'No stored origin — travel fit was skipped.',
      source: 'maps-mcp',
    },
  ],
  signals: FULL.signals.filter((s) => s.label !== 'Drive'),
  sources: ['player-mcp', 'offers-mcp', 'weather-mcp'],
  degraded: ['maps.get_travel_time'],
};

const NEUTRAL: ConciergeEnvelope = {
  ...FULL,
  verdict:
    "Here's what's happening at the resort — dining, shows, and your reservations are all in the app.",
  fit_score: null,
  confidence: 'high',
  reasons: [],
  signals: [],
  sources: [],
  degraded: [],
  cta: null,
};

const OFFERS: RankedOffer[] = [
  {
    offer_id: 'o1',
    title: 'Weekend Steakhouse Credit',
    kind: 'offer',
    score: 0.85,
    rank: 1,
    why_you: [
      {
        code: 'segment_match',
        chip: 'Picked for vip members',
        detail: 'This offer targets your segment.',
        source: 'offers-mcp',
      },
      {
        code: 'expiring_soon',
        chip: 'Expiring soon',
        detail: 'Ends 2026-07-04.',
        source: 'offers-mcp',
      },
    ],
  },
  {
    offer_id: 'o2',
    title: 'Weekday Free Play',
    kind: 'offer',
    score: 0.7,
    rank: 2,
    why_you: [
      {
        code: 'broad_offer',
        chip: 'Available to you',
        detail: 'Open to all.',
        source: 'offers-mcp',
      },
    ],
  },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText variant="label" color="muted" style={styles.sectionLabel}>
        {title}
      </ThemedText>
      {children}
    </View>
  );
}

export function KitGalleryScreen(): React.JSX.Element {
  const theme = useTheme();
  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <ThemedText variant="body" color="muted">
          Every kit component in every state. Colors come from the manifest theme — toggle
          light/dark in Appearance. Scheme: {theme.scheme}.
        </ThemedText>

        <Section title="RecoHero — full">
          <RecoHero envelope={FULL} onCta={() => {}} />
        </Section>
        <Section title="RecoHero — degraded (no maps source)">
          <RecoHero envelope={DEGRADED} onCta={() => {}} />
        </Section>
        <Section title="RecoHero — RG-neutral (no score, no nudge, no CTA)">
          <RecoHero envelope={NEUTRAL} />
        </Section>

        <Section title="ContextStrip">
          <ContextStrip signals={FULL.signals} />
        </Section>

        <Section title="AIAnswerCard — with signal grid + sources">
          <AIAnswerCard envelope={FULL} />
        </Section>
        <Section title="AIAnswerCard — degraded">
          <AIAnswerCard envelope={DEGRADED} />
        </Section>

        <Section title="RankedOfferCard">
          <View style={styles.stack}>
            {OFFERS.map((offer) => (
              <RankedOfferCard key={offer.offer_id} offer={offer} onPress={() => {}} />
            ))}
          </View>
        </Section>

        <Section title="AriaOrb · WhyYouPill · SourceChip · SignalTile">
          <View style={styles.row}>
            <AriaOrb />
            <WhyYouPill reason={FULL.reasons[1]} />
            <SourceChip source="weather-mcp" />
          </View>
          <View style={[styles.row, styles.tiles]}>
            <SignalTile signal={FULL.signals[0]} />
            <SignalTile signal={FULL.signals[1]} />
          </View>
        </Section>

        <Button label="Done" variant="secondary" style={styles.done} onPress={() => {}} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 16, paddingBottom: 40, gap: 4 },
  section: { marginTop: 16 },
  sectionLabel: { marginBottom: 8 },
  stack: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tiles: { marginTop: 10 },
  done: { marginTop: 24, alignSelf: 'center' },
});
