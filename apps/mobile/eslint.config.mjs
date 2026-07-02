import config from '@repo/config/eslint';

/**
 * Flat ESLint config for the mobile app — aligned with the monorepo (ESLint 9 + typescript-eslint).
 * The React Native template ships a legacy `@react-native` eslintrc built for ESLint 8, which is
 * incompatible with the workspace's hoisted ESLint 9 / typescript-eslint 8; we use the shared
 * `@repo/config` (same as the admin app) instead and ignore the native + tooling files.
 */
export default [
  ...config,
  {
    ignores: [
      'android/**',
      'ios/**',
      'vendor/**',
      'coverage/**',
      'e2e/**',
      '.detoxrc.js',
      'metro.config.js',
      'babel.config.js',
      'jest.config.js',
      'jest.setup.js',
      'react-native.config.js',
      '.prettierrc.js',
      '.eslintrc.js',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // RN platform code uses ambient globals and occasional structural casts; keep the shared TS
      // rules but allow empty catch blocks (best-effort side effects) and pragmatic casts.
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
];
