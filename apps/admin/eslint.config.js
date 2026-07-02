import config from '@repo/config/eslint';

export default [
  ...config,
  {
    ignores: ['dist/**', 'node_modules/**', 'vite.config.ts', 'tailwind.config.ts'],
  },
];
