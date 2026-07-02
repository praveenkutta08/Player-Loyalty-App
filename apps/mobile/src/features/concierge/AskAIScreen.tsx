import { Send } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Input, Screen, ThemedText } from '../../components';
import { useTheme } from '../../theme/ThemeProvider';

import { AIAnswerCard } from './components';
import { useAskConciergeMutation, useGetBriefQuery } from './conciergeApi';
import { ConsentPrompt } from './ConsentPrompt';
import { useConciergePersona } from './useConciergePersona';

import type { ConciergeEnvelope } from './types';

const SUGGESTIONS = [
  'Is it worth driving in this weekend?',
  'What are my best offers right now?',
  'How close am I to the next tier?',
];

interface Exchange {
  question: string;
  answer: ConciergeEnvelope;
}

/**
 * Ask AI (P6.6) — opened from the Home hero and the top-bar entry; NOT a bottom tab, and
 * More ▸ Support stays a separate, unchanged surface (service vs. help). Answers render as
 * structured AIAnswerCards with source chips + suggested follow-ups. If the concierge is
 * missing a stored origin, the consent prompt appears before the conversation.
 */
export function AskAIScreen(): React.JSX.Element {
  const theme = useTheme();
  const { name } = useConciergePersona();
  const [ask, askState] = useAskConciergeMutation();
  const brief = useGetBriefQuery();
  const [question, setQuestion] = useState('');
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [consentDismissed, setConsentDismissed] = useState(false);

  // The brief tells us whether travel context is degraded → surface the consent ask up front.
  const needsConsent =
    !consentDismissed &&
    (brief.data?.degraded ?? []).some((tool) => tool.startsWith('maps.')) &&
    (brief.data?.reasons ?? []).some((r) => r.code === 'travel_fit_missing');

  const submit = async (text: string): Promise<void> => {
    const trimmed = text.trim();
    if (!trimmed || askState.isLoading) return;
    setQuestion('');
    try {
      const answer = await ask({ question: trimmed }).unwrap();
      setExchanges((previous) => [...previous, { question: trimmed, answer }]);
    } catch {
      // Keep the question in the box so the player can retry.
      setQuestion(trimmed);
    }
  };

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        testID="ask-scroll"
      >
        <ThemedText variant="body" color="muted">
          Ask {name} about visiting — answers come from your profile, offers, weather and drive
          time, with sources shown.
        </ThemedText>

        {needsConsent ? (
          <View style={styles.consent}>
            <ConsentPrompt onDone={() => setConsentDismissed(true)} />
          </View>
        ) : null}

        {exchanges.map((exchange, index) => (
          <View key={`${index}-${exchange.question}`} style={styles.exchange}>
            <ThemedText variant="title" style={styles.question}>
              {exchange.question}
            </ThemedText>
            <AIAnswerCard envelope={exchange.answer} />
          </View>
        ))}

        {askState.isLoading ? (
          <ThemedText variant="body" color="muted" style={styles.thinking}>
            {name} is thinking…
          </ThemedText>
        ) : null}

        {exchanges.length === 0 ? (
          <View style={styles.suggestions}>
            {SUGGESTIONS.map((suggestion) => (
              <Pressable
                key={suggestion}
                onPress={() => void submit(suggestion)}
                accessibilityRole="button"
                testID="ask-suggestion"
                style={[
                  styles.suggestion,
                  {
                    borderColor: theme.colors.border.soft,
                    backgroundColor: theme.colors.bg.surface,
                  },
                ]}
              >
                <ThemedText variant="body" color="secondary">
                  {suggestion}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.composer}>
        <Input
          value={question}
          onChangeText={setQuestion}
          placeholder={`Ask ${name}…`}
          containerStyle={styles.input}
          onSubmitEditing={() => void submit(question)}
          returnKeyType="send"
          testID="ask-input"
        />
        <Pressable
          onPress={() => void submit(question)}
          accessibilityRole="button"
          accessibilityLabel="Send"
          testID="ask-send"
          style={[styles.send, { backgroundColor: theme.colors.brand.gold }]}
        >
          <Send size={18} color={theme.colors.brand.onGold} />
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 16, paddingBottom: 24, gap: 12 },
  consent: { marginTop: 4 },
  exchange: { gap: 8 },
  question: { marginTop: 8 },
  thinking: { marginTop: 4 },
  suggestions: { gap: 8, marginTop: 8 },
  suggestion: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  composer: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 8 },
  input: { flex: 1 },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
