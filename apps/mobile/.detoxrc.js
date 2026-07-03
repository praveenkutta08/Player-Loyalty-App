/**
 * Detox config (audit M11) — Android emulator lane for the demo flavor. Runnable locally and in
 * the workflow_dispatch CI job; iOS is added on a Mac. Points at the `demo` product flavor's
 * debug APK (H6) so the E2E app matches what CI builds.
 *
 *   pnpm --filter mobile e2e:build   # gradle assembleDemoDebug + androidTest
 *   pnpm --filter mobile e2e         # detox test on a running emulator
 */
/** @type {Detox.DetoxConfig} */
module.exports = {
  testRunner: {
    args: {
      $0: 'jest',
      config: 'e2e/jest.config.js',
    },
    jest: {
      setupTimeout: 120000,
    },
  },
  apps: {
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/demo/debug/app-demo-debug.apk',
      testBinaryPath:
        'android/app/build/outputs/apk/androidTest/demo/debug/app-demo-debug-androidTest.apk',
      build:
        'cd android && ./gradlew :app:assembleDemoDebug :app:assembleDemoDebugAndroidTest -DtestBuildType=debug',
    },
  },
  devices: {
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: process.env.DETOX_AVD_NAME || 'Pixel_7_API_34',
      },
    },
  },
  configurations: {
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug',
    },
  },
};
