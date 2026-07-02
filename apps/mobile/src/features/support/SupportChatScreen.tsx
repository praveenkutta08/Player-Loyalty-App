import { Headphones, Send } from 'lucide-react-native';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Button, Card, Input, Screen, StatusPill, ThemedText } from '../../components';
import { useTheme } from '../../theme/ThemeProvider';

import { useEscalateMutation, useSendChatMutation } from './supportApi';

interface Turn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

/**
 * M7 — Support chat: a message thread with the assistant, send, and escalate-to-human. The reply's
 * `escalate`/`refused` flags surface a "talk to a person" path; escalation opens a ticket.
 */
export function SupportChatScreen(): React.JSX.Element {
  const theme = useTheme();
  const [turns, setTurns] = useState<Turn[]>([
    { id: 'greet', role: 'assistant', text: 'Hi! How can I help you today?' },
  ]);
  const [draft, setDraft] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [canEscalate, setCanEscalate] = useState(false);
  const [escalated, setEscalated] = useState(false);

  const [send, { isLoading: sending }] = useSendChatMutation();
  const [escalate, { isLoading: escalating }] = useEscalateMutation();

  async function submit(): Promise<void> {
    const message = draft.trim();
    if (!message) return;
    setDraft('');
    const userTurn: Turn = { id: `u-${turns.length}`, role: 'user', text: message };
    setTurns((t) => [...t, userTurn]);
    try {
      const res = await send({ message, session_id: sessionId }).unwrap();
      setSessionId(res.session_id);
      setCanEscalate(res.escalate || res.refused);
      setTurns((t) => [...t, { id: `a-${t.length}`, role: 'assistant', text: res.reply }]);
    } catch {
      setTurns((t) => [
        ...t,
        { id: `e-${t.length}`, role: 'assistant', text: 'Sorry — I couldn’t reach support just now.' },
      ]);
    }
  }

  async function talkToHuman(): Promise<void> {
    if (!sessionId) return;
    try {
      await escalate({ session_id: sessionId, subject: 'Player support request' }).unwrap();
      setEscalated(true);
    } catch {
      /* stays available to retry */
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.fill}
          contentContainerStyle={styles.thread}
          showsVerticalScrollIndicator={false}
        >
          {turns.map((turn) => (
            <Bubble key={turn.id} turn={turn} />
          ))}
          {escalated ? (
            <Card style={styles.escalatedCard}>
              <View style={styles.escalatedHead}>
                <Headphones size={18} color={theme.colors.brand.gold} />
                <ThemedText variant="title" style={styles.escalatedTitle}>
                  Connected to a specialist
                </ThemedText>
              </View>
              <ThemedText variant="body" color="muted">
                A team member will pick up this conversation shortly.
              </ThemedText>
            </Card>
          ) : null}
        </ScrollView>

        {canEscalate && !escalated ? (
          <Button
            label="Talk to a person"
            variant="secondary"
            icon={<Headphones size={16} color={theme.colors.text.primary} />}
            loading={escalating}
            style={styles.escalate}
            onPress={() => void talkToHuman()}
            testID="escalate"
          />
        ) : null}

        <View style={styles.composer}>
          <Input
            value={draft}
            onChangeText={setDraft}
            placeholder="Type a message"
            containerStyle={styles.input}
            onSubmitEditing={() => void submit()}
            returnKeyType="send"
          />
          <Button
            label=""
            icon={<Send size={18} color={theme.colors.brand.onGold} />}
            loading={sending}
            disabled={draft.trim().length === 0}
            style={styles.sendBtn}
            onPress={() => void submit()}
            testID="send-message"
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Bubble({ turn }: { turn: Turn }): React.JSX.Element {
  const theme = useTheme();
  const mine = turn.role === 'user';
  return (
    <View style={[styles.bubbleRow, mine ? styles.right : styles.left]}>
      {!mine ? <StatusPill label="Assistant" tone="info" /> : null}
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: mine ? theme.colors.brand.gold : theme.colors.bg.surface,
            borderColor: theme.colors.border.default,
          },
        ]}
      >
        <ThemedText
          variant="body"
          style={{ color: mine ? theme.colors.brand.onGold : theme.colors.text.primary }}
        >
          {turn.text}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  thread: { paddingVertical: 16 },
  bubbleRow: { marginBottom: 12, maxWidth: '85%' },
  left: { alignSelf: 'flex-start' },
  right: { alignSelf: 'flex-end' },
  bubble: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 4,
  },
  escalatedCard: { marginTop: 8 },
  escalatedHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  escalatedTitle: { marginLeft: 8 },
  escalate: { marginBottom: 8 },
  composer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 8 },
  input: { flex: 1 },
  sendBtn: { paddingHorizontal: 16 },
});
