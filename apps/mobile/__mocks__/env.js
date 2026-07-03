// Jest stand-in for the react-native-dotenv virtual `@env` module. Under tests the dotenv babel
// plugin is disabled (see babel.config.js) because its `allowUndefined` rewrite clashes with
// babel-plugin-istanbul's instrumentation under `--coverage` (leaving bare `API_HOST` references
// → ReferenceError). Tests never need real .env values — buildConfig.ts falls back to demo values —
// so we resolve `@env` to blanks deterministically in both normal and coverage runs.
module.exports = {
  API_HOST: '',
  TENANT_ID: '',
};
