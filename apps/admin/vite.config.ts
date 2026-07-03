/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

// Strict Content-Security-Policy (H5) — injected into the built index.html only. It blocks inline
// and remote scripts (no `unsafe-inline`/`unsafe-eval`), so an XSS payload can't run injected JS to
// exfiltrate a token, and confines network egress to our own origin. `connect-src 'self'` covers
// the same-origin API; the MapLibre geofence editor legitimately fetches demo tiles/glyphs, so that
// origin is allowed for map data (img/connect) only. Applied at build only because Vite's dev
// server relies on inline scripts + eval for HMR — the dev origin is trusted and local.
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https://demotiles.maplibre.org",
  "connect-src 'self' https://demotiles.maplibre.org",
  "worker-src 'self' blob:",
].join('; ');

function cspPlugin(): Plugin {
  return {
    name: 'inject-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '</title>',
        `</title>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
      );
    },
  };
}

// The admin console talks to the FastAPI backend under /api/v1; in dev we proxy to the local
// backend so RTK Query can use same-origin relative URLs (matching @repo/api-client's baseApi).
export default defineConfig({
  plugins: [react(), cspPlugin()],
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
