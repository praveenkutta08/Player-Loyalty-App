/* eslint-disable @typescript-eslint/no-require-imports */
// The mobile app has no @types/node, so read files through Jest's runtime require (mirrors
// jest.setup.js). This is a Node-only guard test, never bundled into the app.
declare const __dirname: string;

const { readFileSync } = require('fs') as { readFileSync(p: string, enc: string): string };
const { join } = require('path') as { join(...parts: string[]): string };

// H6 (iOS) — guards the repo-side white-label wiring that must line up before the Mac-only Xcode
// steps (see docs/WHITE_LABEL_CUSTOMIZATION_ROADMAP.md). If Info.plist stops sourcing the tenant
// identity from the xcconfig, or a bundled font drifts from UIAppFonts, a per-tenant iOS build would
// silently fall back to the demo identity / system fonts — this catches that in CI.
const infoPlist = readFileSync(join(__dirname, '..', 'ios', 'mobile', 'Info.plist'), 'utf8');

const BUNDLED_FONTS = [
  'Bodoni Moda.ttf',
  'Bodoni Moda_bold.ttf',
  'Manrope.ttf',
  'Manrope_bold.ttf',
  'JetBrains Mono.ttf',
  'JetBrains Mono_bold.ttf',
];

describe('iOS white-label Info.plist wiring (H6)', () => {
  // Whitespace-independent: each key must be immediately followed by its xcconfig placeholder.
  const bindsTo = (key: string, varName: string): RegExp =>
    new RegExp(`<key>${key}</key>\\s*<string>\\$\\(${varName}\\)</string>`);

  it('sources the launcher name and tenant identity from the xcconfig build settings', () => {
    expect(infoPlist).toMatch(bindsTo('CFBundleDisplayName', 'TENANT_APP_NAME'));
    expect(infoPlist).toMatch(bindsTo('TenantId', 'TENANT_ID'));
    expect(infoPlist).toMatch(bindsTo('TenantSlug', 'TENANT_SLUG'));
    expect(infoPlist).toMatch(bindsTo('TenantApiBaseUrl', 'TENANT_API_BASE_URL'));
  });

  it('declares every bundled brand font in UIAppFonts', () => {
    expect(infoPlist).toContain('<key>UIAppFonts</key>');
    for (const font of BUNDLED_FONTS) {
      expect(infoPlist).toContain(`<string>${font}</string>`);
    }
  });

  it('keeps the xcconfig display name in sync with the two committed tenant configs', () => {
    const demo = readFileSync(join(__dirname, '..', 'ios', 'Config', 'Demo.xcconfig'), 'utf8');
    const aurora = readFileSync(
      join(__dirname, '..', 'ios', 'Config', 'AuroraBay.xcconfig'),
      'utf8',
    );
    expect(demo).toMatch(/TENANT_APP_NAME\s*=\s*\S/);
    expect(aurora).toMatch(/TENANT_APP_NAME\s*=\s*\S/);
    // Distinct bundle ids so both tenants can co-install.
    expect(demo).toMatch(/PRODUCT_BUNDLE_IDENTIFIER\s*=/);
    expect(aurora).toContain('aurorabay');
  });
});
