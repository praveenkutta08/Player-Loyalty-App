/**
 * React Native CLI config. `assets` points at the bundled fonts so `npx react-native-asset` links
 * them into the iOS/Android builds. The obsidian system (RS0) uses **Playfair Display** (display)
 * + **Inter** (UI); the earlier Bodoni Moda / Manrope TTFs remain as fallbacks. Drop TTFs into
 * `assets/fonts/`; until `npx react-native-asset` runs + the app rebuilds, text falls back to system
 * fonts gracefully. Native module linking is automatic (autolinking).
 */
module.exports = {
  assets: ['./assets/fonts'],
};
