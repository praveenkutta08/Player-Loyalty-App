/* eslint-disable */
// @ts-nocheck
/**
 * Detox E2E for the mobile app (P5.3): the auth → offers → wallet(mock) → geofence-dwell(sim)
 * critical path. Uses the testIDs the screens already expose (e.g. `wallet-deposit`, `move-submit`,
 * `dwell-<zoneId>`). Gated: requires a native device/simulator build + Detox
 * (`pnpm add -D detox && detox build`); not part of the default `pnpm test` (Jest ignores e2e/).
 * See docs/TESTING.md.
 */
import { by, device, element, expect } from 'detox';

describe('player critical path', () => {
  beforeAll(async () => {
    await device.launchApp({ permissions: { notifications: 'YES', location: 'always' } });
  });

  it('logs in', async () => {
    await element(by.id('login-email')).typeText('demo.player@example.com');
    await element(by.id('login-password')).typeText('password');
    await element(by.id('login-submit')).tap();
    await expect(element(by.id('home-screen'))).toBeVisible();
  });

  it('browses and redeems an offer', async () => {
    await element(by.text('Offers')).tap();
    await element(by.id('offer-card')).atIndex(0).tap();
    await element(by.id('redeem-offer')).tap();
    await expect(element(by.text(/redeemed/i))).toBeVisible();
  });

  it('funds the wallet (mock cashless)', async () => {
    await element(by.text('Scan/Play')).tap();
    await element(by.id('scan-ble')).tap(); // simulated peripheral
    await element(by.text('Open wallet')).tap();
    await element(by.id('wallet-deposit')).tap();
    await element(by.id('move-submit')).tap();
    await expect(element(by.id('move-done'))).toBeVisible();
  });

  it('fires a geofence dwell (simulated) and receives a promo', async () => {
    await element(by.text('More')).tap();
    await element(by.text('Nearby')).tap();
    await element(by.id('setup-location')).tap();
    await element(by.id('grant-location')).tap();
    await element(by.id('dwell-EGM')).atIndex(0).tap(); // any zone's simulate-dwell button
    await expect(element(by.text(/offer sent/i))).toBeVisible();
  });
});
