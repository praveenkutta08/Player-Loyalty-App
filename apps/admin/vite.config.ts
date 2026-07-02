/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The admin console talks to the FastAPI backend under /api/v1; in dev we proxy to the local
// backend so RTK Query can use same-origin relative URLs (matching @repo/api-client's baseApi).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    // The workspace hoists multiple React copies (admin 18 + mobile 19 via peers); dedupe so hooks
    // share one dispatcher.
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    css: true,
    // Keep Vitest's default excludes and also skip e2e/ (Playwright runs it under its own runner).
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
  },
});
