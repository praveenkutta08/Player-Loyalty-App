import { Platform } from 'react-native';

/**
 * Push messaging wrapper (Notifee + Firebase in P4.9). Isolated behind this contract so the app
 * can register a device token now and swap the real native implementation in later. The dev stub
 * returns a deterministic fake token so device registration (P4.3) is exercisable offline.
 */
export interface PushModule {
  getDeviceToken(): Promise<string>;
  platform(): 'ios' | 'android';
}

export const push: PushModule = {
  async getDeviceToken() {
    return `dev-${Platform.OS}-push-token`;
  },
  platform() {
    return Platform.OS === 'ios' ? 'ios' : 'android';
  },
};
