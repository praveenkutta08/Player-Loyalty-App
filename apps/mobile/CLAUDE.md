# apps/mobile — Bare React Native app (CLAUDE.md)

White-label player app. Ships **no** brand values — theme + enabled features come from the
tenant **manifest** at runtime. Native modules are wrapped behind TS interfaces.

## Stack & layout
- Bare React Native (TS) + React Navigation + Redux Toolkit / RTK Query.
- Native: react-native-ble-plx, iBeacon (react-native-beacons-manager), background geolocation,
  Notifee + @react-native-firebase/messaging, react-native-keychain, react-native-maps.
```
src/
  app/            store, navigation, providers (Theme, Features, Auth)
  api/            RTK Query (types from packages/api-client)
  theme/          ThemeProvider + tokens resolved from manifest
  features/       auth, home, offers, promotions, account, wallet, cardless(ble),
                  reservations, valet, digitalkey, notifications, geofencing
  native/         TS wrappers: ble.ts, beacons.ts, geofence.ts, push.ts, secureStore.ts, digitalKey.ts
```

## Rules
- On launch/refresh: fetch `/config/manifest`, hydrate `ThemeProvider` + `FeatureProvider`;
  feature flags show/hide modules (e.g., hide Digital Key when no hotel).
- **White-label builds:** iOS schemes + Android product flavors set app name/icon/bundle id/signing
  from a per-tenant build config; runtime theming avoids most rebuilds.
- **Cardless (mock):** real fund/transfer/cashout UX; BLE pairing simulated; QR fallback.
- **Geofencing:** OS region monitoring (GPS zones) + iBeacon ranging (indoor dwell). Respect the
  ~20 monitored-region iOS limit by syncing nearest zones. Require explicit location + background
  opt-in; post enter/dwell/exit to `/geo/events`.
- **Digital key (mock):** stub SDK behind `native/digitalKey.ts`; real issue/store/unlock UX.
- Secrets/tokens in Keychain/Keystore. Money screens surface idempotency + clear states.

## Commands
`pnpm start` (Metro), `pnpm ios` / `pnpm android`, `pnpm test` (Jest), Detox for E2E.

> **Firm screen list:** see `design/SCREEN_INVENTORY.md` (64 screens mapped to P4.x prompts, with MVP status + feature flags).
