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
    // Admin and mobile are both on React 19, but the workspace can still hoist multiple copies;
    // dedupe so hooks share one dispatcher (also keeps Vitest from loading two React instances).
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
  build: {
    // MapLibre is a single ~800 kB library, isolated into its own lazy chunk (loaded only by the
    // geofence editor, see GeofencingScreen). It legitimately exceeds the 500 kB default, so lift
    // the warning threshold rather than have it fire on an intentional, on-demand vendor chunk.
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Split heavy vendors out of the app chunk so the initial bundle stays lean and
        // long-lived libs cache independently of app code.
        manualChunks: {
          react: ['react', 'react-dom'],
          router: ['@tanstack/react-router'],
          redux: ['@reduxjs/toolkit', 'react-redux'],
          maplibre: ['maplibre-gl'],
          forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
        },
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
