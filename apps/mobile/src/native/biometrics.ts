/**
 * Biometric authentication wrapper (Face ID / Touch ID / Android biometrics). The real build gates
 * the Keychain refresh token with a biometric access-control flag (react-native-keychain) or
 * react-native-biometrics; the MVP ships a JS mock that reports Face ID and succeeds, so the
 * "Identify to Enter" flow is demoable without a native build. No secrets leave the device.
 */
export type SensorType = 'FaceID' | 'TouchID' | 'Biometrics' | 'None';

export interface BiometricsModule {
  isAvailable(): Promise<boolean>;
  sensorType(): Promise<SensorType>;
  /** Prompt the OS biometric check; resolves true on success, false on user cancel/failure. */
  authenticate(reason: string): Promise<boolean>;
}

export const biometrics: BiometricsModule = {
  async isAvailable() {
    return true;
  },
  async sensorType() {
    return 'FaceID';
  },
  async authenticate() {
    // The mock always succeeds; the real SDK shows the OS prompt (with the reason) and returns it.
    return true;
  },
};
