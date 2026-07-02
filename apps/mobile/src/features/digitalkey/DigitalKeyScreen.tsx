import { DoorOpen, KeyRound, Lock, LockKeyhole } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button, Card, Input, Screen, StatusPill, ThemedText } from '../../components';
import { useTheme } from '../../theme/ThemeProvider';
import { useGetReservationsQuery } from '../reservations/reservationsApi';

import { useGetKeysQuery, useIssueKeyMutation } from './digitalKeyApi';
import { useUnlockKey } from './useUnlockKey';

import type { DigitalKeyOut } from './digitalKeyApi';
import type { UnlockState } from './useUnlockKey';

/**
 * C14 — Digital key. Shows active room keys for confirmed hotel stays and an Unlock action that
 * runs the on-device SDK handshake + server authorization. If no key exists, issue one for a
 * confirmed hotel reservation (server rejects anything else).
 */
export function DigitalKeyScreen(): React.JSX.Element {
  const keys = useGetKeysQuery();
  const active = (keys.data ?? []).filter((k) => k.status === 'active');

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {active.length > 0 ? active.map((k) => <KeyCard key={k.id} keyItem={k} />) : <IssueKey />}
      </ScrollView>
    </Screen>
  );
}

function KeyCard({ keyItem }: { keyItem: DigitalKeyOut }): React.JSX.Element {
  const theme = useTheme();
  const { state, unlock } = useUnlockKey();

  return (
    <Card style={[styles.keyCard, { backgroundColor: theme.colors.brand.gold }]}>
      <View style={styles.keyHead}>
        <KeyRound size={24} color={theme.colors.brand.onGold} />
        <StatusPill label={keyItem.status} tone="success" />
      </View>
      <ThemedText variant="kicker" style={{ color: theme.colors.brand.onGold }}>
        Room
      </ThemedText>
      <ThemedText variant="display" style={{ color: theme.colors.brand.onGold }}>
        {keyItem.room}
      </ThemedText>
      <ThemedText variant="label" style={[styles.provider, { color: theme.colors.brand.onGold }]}>
        {keyItem.provider} · mobile key
      </ThemedText>

      <UnlockButton state={state} onPress={() => void unlock(keyItem.id, `room-${keyItem.room}`)} />
      <UnlockFeedback state={state} />
    </Card>
  );
}

function UnlockButton({
  state,
  onPress,
}: {
  state: UnlockState;
  onPress: () => void;
}): React.JSX.Element {
  const theme = useTheme();
  const unlocking = state === 'unlocking';
  return (
    <Button
      label={state === 'unlocked' ? 'Unlocked' : 'Hold near door to unlock'}
      icon={
        state === 'unlocked' ? undefined : (
          <LockKeyhole size={18} color={theme.colors.brand.onGold} />
        )
      }
      loading={unlocking}
      disabled={unlocking}
      style={styles.unlock}
      onPress={onPress}
      testID="unlock-key"
    />
  );
}

function UnlockFeedback({ state }: { state: UnlockState }): React.JSX.Element | null {
  const theme = useTheme();
  if (state === 'unlocked') {
    return (
      <View style={styles.feedback}>
        <DoorOpen size={18} color={theme.colors.brand.onGold} />
        <ThemedText
          variant="label"
          style={[styles.feedbackText, { color: theme.colors.brand.onGold }]}
        >
          Door unlocked — welcome back.
        </ThemedText>
      </View>
    );
  }
  if (state === 'denied' || state === 'error') {
    return (
      <View style={styles.feedback}>
        <Lock size={18} color={theme.colors.brand.onGold} />
        <ThemedText
          variant="label"
          style={[styles.feedbackText, { color: theme.colors.brand.onGold }]}
        >
          {state === 'denied'
            ? 'Access denied — check your reservation.'
            : 'Couldn’t reach the lock. Try again.'}
        </ThemedText>
      </View>
    );
  }
  return null;
}

/** Issue path: pick a confirmed hotel reservation + room, then request the key. */
function IssueKey(): React.JSX.Element {
  const theme = useTheme();
  const reservations = useGetReservationsQuery();
  const [issue, { isLoading, isError }] = useIssueKeyMutation();
  const [room, setRoom] = useState('1204');

  const eligible = (reservations.data ?? []).find(
    (r) => r.type === 'hotel' && r.status === 'confirmed',
  );

  return (
    <Card style={styles.issueCard}>
      <View style={styles.issueHead}>
        <KeyRound size={22} color={theme.colors.brand.gold} />
        <ThemedText variant="title" style={styles.issueTitle}>
          Digital room key
        </ThemedText>
      </View>

      {eligible ? (
        <>
          <ThemedText variant="body" color="muted" style={styles.issueHint}>
            Issue a mobile key for your confirmed hotel stay.
          </ThemedText>
          <Input label="Room" value={room} onChangeText={setRoom} keyboardType="number-pad" />
          {isError ? <StatusPill label="Couldn’t issue key" tone="error" /> : null}
          <Button
            label="Issue key"
            loading={isLoading}
            disabled={room.trim().length === 0}
            style={styles.issueBtn}
            onPress={() => void issue({ reservation_id: eligible.id, room: room.trim() })}
            testID="issue-key"
          />
        </>
      ) : (
        <ThemedText variant="body" color="muted" style={styles.issueHint}>
          Book and confirm a hotel stay to receive a digital room key.
        </ThemedText>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 16, paddingBottom: 32 },
  keyCard: { marginBottom: 16 },
  keyHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  provider: { marginTop: 4, textTransform: 'capitalize' },
  unlock: { marginTop: 20 },
  feedback: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  feedbackText: { marginLeft: 8, flex: 1 },
  issueCard: { marginTop: 8 },
  issueHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  issueTitle: { marginLeft: 8 },
  issueHint: { marginBottom: 12 },
  issueBtn: { marginTop: 16 },
});
