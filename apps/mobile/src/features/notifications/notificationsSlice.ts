import { createSlice } from '@reduxjs/toolkit';

import type { PushData } from './deepLinks';
import type { PayloadAction } from '@reduxjs/toolkit';

/**
 * In-app inbox of received push/messages (G2/M6). Real pushes are delivered on-device by the native
 * layer; in the MVP the mock push bridge feeds this store. The server campaign log is the source of
 * truth for delivery; this is the on-device message center + read state.
 */
export interface InboxMessage {
  id: string;
  title: string;
  body: string;
  /** ISO timestamp. */
  receivedAt: string;
  read: boolean;
  /** Deep-link payload carried by the notification, if any. */
  data?: PushData;
}

export interface NotificationsState {
  messages: InboxMessage[];
}

/** Seeded so the inbox + center render in the demo before any live push arrives. */
const initialState: NotificationsState = {
  messages: [
    {
      id: 'seed-welcome',
      title: 'Welcome',
      body: 'Your rewards are ready — explore this week’s offers.',
      receivedAt: '2026-07-01T18:00:00.000Z',
      read: false,
      data: { type: 'offer' },
    },
  ],
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    receiveMessage(state, action: PayloadAction<InboxMessage>) {
      if (!state.messages.some((m) => m.id === action.payload.id)) {
        state.messages.unshift(action.payload);
      }
    },
    markRead(state, action: PayloadAction<string>) {
      const msg = state.messages.find((m) => m.id === action.payload);
      if (msg) msg.read = true;
    },
    markAllRead(state) {
      state.messages.forEach((m) => {
        m.read = true;
      });
    },
  },
});

export const { receiveMessage, markRead, markAllRead } = notificationsSlice.actions;
export default notificationsSlice.reducer;

/** Count of unread messages, for the bell badge. */
export function unreadCount(state: NotificationsState): number {
  return state.messages.filter((m) => !m.read).length;
}
