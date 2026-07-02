import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E for the admin console (P5.3). Runs the login → provision-tenant → publish-offer
 * critical path against a running admin dev server + backend. Kept out of the default unit lane
 * (Vitest); run it explicitly with `pnpm --filter admin e2e` after starting the stack, or wire it as
 * a separate CI job. Requires `@playwright/test` (`pnpm add -D @playwright/test && npx playwright
 * install`) and the backend + admin dev server on the URLs below.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    baseURL: process.env.ADMIN_BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
