import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Card, ThemedText } from '../../../components';

import { SignalTile } from './SignalTile';
import { SourceChip } from './SourceChip';

import type { ConciergeEnvelope } from '../types';

/**
 * Structured AI answer: headline verdict + signal grid + source chips — never a plain prose
 * wall. Degraded sources are surfaced explicitly ("couldn't reach X").
 */
export function AIAnswerCard({ envelope }: { envelope: ConciergeEnvelope }): React.JSX.Element {
  return (
    <Card style={styles.card}>
      <ThemedText variant="title" testID="answer-headline">
        {envelope.verdict}
      </ThemedText>

      {envelope.signals.length > 0 ? (
        <View style={styles.grid}>
          {envelope.signals.map((signal) => (
            <SignalTile key={signal.label} signal={signal} />
          ))}
        </View>
      ) : null}

      {envelope.degraded.length > 0 ? (
        <ThemedText variant="label" color="faint" testID="answer-degraded">
          Couldn't reach: {envelope.degraded.join(', ')}
        </ThemedText>
      ) : null}

      <View style={styles.sources}>
        {envelope.sources.map((source) => (
          <SourceChip key={source} source={source} />
        ))}
      </View>

      <ThemedText variant="label" color="faint">
        {envelope.disclaimer}
      </ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sources: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
