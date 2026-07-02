import config from '@repo/config/eslint';

export default [
  ...config,
  {
    ignores: ['dist/**', 'node_modules/**', 'e2e/**', 'vite.config.ts', 'tailwind.config.ts'],
  },
];
