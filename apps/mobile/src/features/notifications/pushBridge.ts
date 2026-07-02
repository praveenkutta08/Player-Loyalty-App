import { navigateToTarget } from '../../app/navigation/navigationRef';
import { push } from '../../native/push';

import { resolveDeepLink } from './deepLinks';
import { receiveMessage } from './notificationsSlice';

import type { InboxMessage } from './notificationsSlice';
import type { AppDispatch } from '../../app/store';
import type { PushMessage } from '../../native/push';

/** Convert a native push message into an inbox record (stamped with the provided receive time). */
function toInbox(message: PushMessage, receivedAt: string): InboxMessage {
  return {
    id: message.id,
    title: message.title,
    body: message.body,
    receivedAt,
    read: false,
    data: message.data,
  };
}

/**
 * Wire the native push handlers to the store + navigation. Foreground messages land in the inbox;
 * opening a notification (background/quit) also routes its deep link. Returns an unsubscribe fn.
 * `now` is injected so the call site controls timestamps (tests/resume determinism).
 */
export function registerPushHandlers(dispatch: AppDispatch, now: () => string): () => void {
  const offForeground = push.onForegroundMessage((message) => {
    dispatch(receiveMessage(toInbox(message, now())));
  });
  const offOpened = push.onNotificationOpened((message) => {
    dispatch(receiveMessage(toInbox(message, now())));
    if (message.data) navigateToTarget(resolveDeepLink(message.data));
  });
  return () => {
    offForeground();
    offOpened();
  };
}
