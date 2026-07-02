module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // Inline .env values at build time (no native module) so the per-tenant buildConfig
    // (tenant id, dev API host) comes from apps/mobile/.env — new devs never edit tracked source.
    // Missing keys resolve to undefined; buildConfig.ts supplies demo fallbacks.
    [
      'module:react-native-dotenv',
      { moduleName: '@env', path: '.env', safe: false, allowUndefined: true },
    ],
  ],
};
