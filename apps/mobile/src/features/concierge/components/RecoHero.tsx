import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { Button, Card, ThemedText } from '../../../components';
import { useReducedMotion } from '../../../lib/reducedMotion';
import { useTheme } from '../../../theme/ThemeProvider';
import { useConciergePersona } from '../useConciergePersona';

import { AriaOrb } from './AriaOrb';
import { WhyYouPill } from './WhyYouPill';

import type { ConciergeEnvelope } from '../types';

interface Props {
  envelope: ConciergeEnvelope;
  onCta?: (action: string) => void;
  testID?: string;
}

/**
 * The Home concierge hero: verdict + fit score + reason chips + CTA. Neutral answers
 * (RG-restricted / suppressed: fit_score null) render service content with no score, no chips
 * and no CTA — never a visit nudge. Entrance is a small stagger (opacity/translate only),
 * skipped under reduced motion.
 */
export function RecoHero({ envelope, onCta, testID }: Props): React.JSX.Element {
  const theme = useTheme();
  const { accentColor } = useConciergePersona();
  const reduced = useReducedMotion();
  const enter = useRef(new Animated.Value(reduced ? 1 : 0)).current;

  useEffect(() => {
    if (reduced) {
      enter.setValue(1);
      return;
    }
    Animated.timing(enter, {
      toValue: 1,
      duration: 450,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enter, reduced]);

  const neutral = envelope.fit_score == null;
  const stagger = (from: number) => ({
    opacity: enter,
    transform: [
      {
        translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }),
      },
    ],
  });

  return (
    <Card style={styles.card}>
      <Animated.View style={[styles.headRow, stagger(6)]} testID={testID ?? 'reco-hero'}>
        <AriaOrb size={40} />
        <View style={styles.headText}>
          {!neutral ? (
            <View style={styles.scoreRow}>
              <ThemedText variant="display" style={{ color: accentColor }} testID="fit-score">
                {envelope.fit_score}
              </ThemedText>
              <ThemedText variant="kicker" color="muted" style={styles.scoreUnit}>
                visit fit · {envelope.confidence}
              </ThemedText>
            </View>
          ) : null}
          <ThemedText variant="title" testID="verdict">
            {envelope.verdict}
          </ThemedText>
        </View>
      </Animated.View>

      {!neutral && envelope.reasons.length > 0 ? (
        <Animated.View style={[styles.pills, stagger(10)]}>
          {envelope.reasons.slice(0, 4).map((reason) => (
            <WhyYouPill key={reason.code + reason.chip} reason={reason} />
          ))}
        </Animated.View>
      ) : null}

      {envelope.degraded.length > 0 ? (
        <ThemedText variant="label" color="faint" style={styles.degraded} testID="degraded-note">
          Some context unavailable ({envelope.degraded.length}) — showing what we know.
        </ThemedText>
      ) : null}

      {envelope.cta && onCta ? (
        <Animated.View style={stagger(12)}>
          <Button
            label={envelope.cta.label}
            style={styles.cta}
            onPress={() => onCta(envelope.cta!.action)}
            testID="hero-cta"
          />
        </Animated.View>
      ) : null}

      <ThemedText variant="label" color="faint" style={styles.disclaimer}>
        {envelope.disclaimer}
      </ThemedText>
      <View style={[styles.accentEdge, { backgroundColor: theme.colors.border.soft }]} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, overflow: 'hidden' },
  headRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  headText: { flex: 1, gap: 2 },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  scoreUnit: { marginBottom: 2 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  degraded: { marginTop: -4 },
  cta: { alignSelf: 'flex-start' },
  disclaimer: { marginTop: 2 },
  accentEdge: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 2 },
});
