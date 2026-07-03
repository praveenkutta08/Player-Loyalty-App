module.exports = function (api) {
  // Cache per NODE_ENV so the test-vs-build plugin set below is honored.
  api.cache.using(() => process.env.NODE_ENV);
  const isTest = api.env('test');

  return {
    presets: ['module:@react-native/babel-preset'],
    plugins: [
      // Inline .env values at build time (no native module) so the per-tenant buildConfig
      // (tenant id, dev API host) comes from apps/mobile/.env — new devs never edit tracked source.
      // Missing keys resolve to undefined; buildConfig.ts supplies demo fallbacks.
      //
      // Disabled under test: its `allowUndefined` rewrite leaves bare identifiers that
      // babel-plugin-istanbul (coverage) turns into ReferenceErrors. Jest maps `@env` to
      // __mocks__/env.js instead (see jest.config.js), so both normal and `--coverage` runs work.
      ...(isTest
        ? []
        : [
            [
              'module:react-native-dotenv',
              { moduleName: '@env', path: '.env', safe: false, allowUndefined: true },
            ],
          ]),
    ],
  };
};
