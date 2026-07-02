import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { navigateToTarget } from '../../app/navigation/navigationRef';
import { useAppSelector } from '../../app/store';
import { Button, Card, Screen, ThemedText } from '../../components';

import { resolveDeepLink } from './deepLinks';

import type { RootStackParamList } from '../../app/navigation/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<RootStackParamList, 'MessageDetail'>;

/** M6 — Message detail: full body + a CTA that follows the notification's deep link. */
export function MessageDetailScreen({ route }: Props): React.JSX.Element {
  const { id } = route.params;
  const message = useAppSelector((s) => s.notifications.messages.find((m) => m.id === id));

  if (!message) {
    return (
      <Screen>
        <ThemedText variant="body" color="muted" style={styles.missing}>
          This message is no longer available.
        </ThemedText>
      </Screen>
    );
  }

  const target = message.data ? resolveDeepLink(message.data) : null;
  const hasCta = target !== null && target.kind !== 'home';

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <ThemedText variant="h2" style={styles.title}>
          {message.title}
        </ThemedText>
        <Card>
          <ThemedText variant="body">{message.body}</ThemedText>
        </Card>
        {hasCta ? (
          <Button
            label={ctaLabel(target)}
            style={styles.cta}
            onPress={() => navigateToTarget(target)}
            testID="message-cta"
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function ctaLabel(target: ReturnType<typeof resolveDeepLink>): string {
  switch (target.kind) {
    case 'offers':
      return 'View offers';
    case 'reservation':
      return 'View reservation';
    default:
      return 'Open';
  }
}

const styles = StyleSheet.create({
  content: { paddingVertical: 16, paddingBottom: 32 },
  title: { marginBottom: 12 },
  cta: { marginTop: 20 },
  missing: { marginTop: 24 },
});
