import { expect, test } from '@playwright/test';

/**
 * Admin critical path (P5.3): a super-admin logs in, provisions a tenant, and publishes an offer.
 * Selectors use role/label queries so they track the design-system components. Env credentials
 * (`ADMIN_EMAIL` / `ADMIN_PASSWORD`) default to the seeded super-admin.
 *
 * Gated: needs the backend + admin dev server running (see docs/TESTING.md). Not part of the
 * default `pnpm test` (Vitest excludes e2e/).
 */
// Defaults match the demo seed (app/seed.py): the unrestricted super-admin.
const EMAIL = process.env.ADMIN_EMAIL ?? 'super@demo-casino.com';
const PASSWORD = process.env.ADMIN_PASSWORD ?? 'demo-pass';

test('login → provision tenant → publish offer', async ({ page }) => {
  // 1. Login
  await page.goto('/');
  await page.getByLabel(/email/i).fill(EMAIL);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await expect(page.getByRole('navigation')).toBeVisible();

  // 2. Provision a tenant — the tenants area is labelled "Casino Directory" in the nav.
  const tenantName = `E2E Casino ${Date.now()}`;
  await page.getByRole('link', { name: /casino directory/i }).click();
  await page.getByRole('button', { name: /new tenant|add tenant|create/i }).click();
  await page.getByLabel(/name/i).fill(tenantName);
  await page.getByRole('button', { name: /create|save/i }).click();
  await expect(page.getByText(tenantName)).toBeVisible();

  // 3. Publish an offer for that tenant
  await page.getByRole('link', { name: /offers/i }).click();
  await page.getByRole('button', { name: /new offer|create/i }).click();
  await page.getByLabel(/title/i).fill('E2E Free Spin');
  await page.getByRole('button', { name: /save|create/i }).click();
  await page.getByRole('button', { name: /publish/i }).click();
  await expect(page.getByText(/published/i)).toBeVisible();
});
