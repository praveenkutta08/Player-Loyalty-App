/**
 * React Native CLI config. `assets` points at the bundled brand fonts (Bodoni Moda / Manrope /
 * JetBrains Mono) so `npx react-native-asset` links them into the iOS/Android builds. Drop the TTFs
 * into `assets/fonts/` (they are tenant/brand assets — see design/). Until then the app falls back
 * to system fonts gracefully. Native module linking is automatic (autolinking).
 */
module.exports = {
  assets: ['./assets/fonts'],
};
