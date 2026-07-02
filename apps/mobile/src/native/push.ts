import { Platform } from 'react-native';

/**
 * Push messaging wrapper (Notifee + Firebase in the real build; a JS mock here — those native
 * modules require a native build + Firebase config that the MVP doesn't ship). Isolated behind this
 * contract so the app registers a device token, requests permission, and receives foreground /
 * opened notifications now, then swaps the real native implementation in later.
 *
 * The dev stub returns a deterministic fake token and exposes `simulateIncoming` so a received push
 * (and its deep link) is demoable + testable offline.
 */
export interface PushMessage {
  id: string;
  title: string;
  body: string;
  /** FCM/APNs data payload (string-valued), used for deep-link routing. */
  data?: Record<string, string | undefined>;
}

type MessageHandler = (message: PushMessage) => void;

export interface PushModule {
  getDeviceToken(): Promise<string>;
  platform(): 'ios' | 'android';
  requestPermission(): Promise<boolean>;
  /** Foreground message received while the app is open. Returns an unsubscribe fn. */
  onForegroundMessage(handler: MessageHandler): () => void;
  /** User tapped a notification (background / quit). Returns an unsubscribe fn. */
  onNotificationOpened(handler: MessageHandler): () => void;
  /** Mock-only: emit a foreground message (demo/test). No-op shape in the real SDK. */
  simulateIncoming(message: PushMessage): void;
}

const foreground = new Set<MessageHandler>();
const opened = new Set<MessageHandler>();

export const push: PushModule = {
  async getDeviceToken() {
    return `dev-${Platform.OS}-push-token`;
  },
  platform() {
    return Platform.OS === 'ios' ? 'ios' : 'android';
  },
  async requestPermission() {
    // The mock always grants; the real SDK prompts the OS.
    return true;
  },
  onForegroundMessage(handler) {
    foreground.add(handler);
    return () => foreground.delete(handler);
  },
  onNotificationOpened(handler) {
    opened.add(handler);
    return () => opened.delete(handler);
  },
  simulateIncoming(message) {
    foreground.forEach((h) => h(message));
  },
};
