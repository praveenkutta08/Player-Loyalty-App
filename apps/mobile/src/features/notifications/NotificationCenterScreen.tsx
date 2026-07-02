import { BellOff, Mail, MailOpen } from 'lucide-react-native';
import React from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { useAppDispatch, useAppSelector } from '../../app/store';
import { Button, Screen, ThemedText } from '../../components';
import { useTheme } from '../../theme/ThemeProvider';

import { markAllRead, markRead } from './notificationsSlice';

import type { InboxMessage } from './notificationsSlice';
import type { RootStackParamList } from '../../app/navigation/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<RootStackParamList, 'Notifications'>;

/** G2 — Notifications center: pushes/messages, newest first; tap to open (M6). */
export function NotificationCenterScreen({ navigation }: Props): React.JSX.Element {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const messages = useAppSelector((s) => s.notifications.messages);
  const anyUnread = messages.some((m) => !m.read);

  return (
    <Screen padded={false}>
      <FlatList
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          anyUnread ? (
            <Button
              label="Mark all as read"
              variant="secondary"
              style={styles.markAll}
              onPress={() => dispatch(markAllRead())}
            />
          ) : null
        }
        renderItem={({ item }) => (
          <MessageRow
            message={item}
            onPress={() => {
              dispatch(markRead(item.id));
              navigation.navigate('MessageDetail', { id: item.id });
            }}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <BellOff size={28} color={theme.colors.text.muted} />
            <ThemedText variant="body" color="muted" style={styles.emptyText}>
              No notifications yet.
            </ThemedText>
          </View>
        }
      />
    </Screen>
  );
}

function MessageRow({
  message,
  onPress,
}: {
  message: InboxMessage;
  onPress: () => void;
}): React.JSX.Element {
  const theme = useTheme();
  const Icon = message.read ? MailOpen : Mail;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[styles.row, { borderBottomColor: theme.colors.border.soft }]}
    >
      <Icon size={20} color={message.read ? theme.colors.text.muted : theme.colors.brand.gold} />
      <View style={styles.body}>
        <ThemedText variant="title">{message.title}</ThemedText>
        <ThemedText variant="body" color="muted" numberOfLines={1}>
          {message.body}
        </ThemedText>
      </View>
      {!message.read ? (
        <View style={[styles.dot, { backgroundColor: theme.colors.brand.gold }]} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingVertical: 12, flexGrow: 1 },
  markAll: { alignSelf: 'flex-end', marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  body: { flex: 1, marginLeft: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
  empty: { alignItems: 'center', paddingTop: 64 },
  emptyText: { marginTop: 12 },
});
