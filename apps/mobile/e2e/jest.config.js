/**
 * Jest runner config for Detox E2E (audit M11) — separate from the unit jest.config.js so the
 * default `pnpm --filter mobile test` never picks up device specs (and vice versa).
 */
/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  rootDir: '..',
  testMatch: ['<rootDir>/e2e/**/*.e2e.ts'],
  testTimeout: 120000,
  maxWorkers: 1,
  globalSetup: 'detox/runners/jest/globalSetup',
  globalTeardown: 'detox/runners/jest/globalTeardown',
  reporters: ['detox/runners/jest/reporter'],
  testEnvironment: 'detox/runners/jest/testEnvironment',
  transform: {
    '\\.[jt]sx?$': ['babel-jest', { presets: ['module:@react-native/babel-preset'] }],
  },
  verbose: true,
};
