# Mobile Release: Build & Signing (fastlane) — P5.5

How the white-label RN app gets built, signed, and submitted to the stores **later** — CI today
only produces a debug APK artifact (`.github/workflows/ci.yml`, `android` job). Nothing below is
wired yet; this is the documented path so store submission is a known quantity, not a scramble.

## White-label build model (recap)

One codebase, N tenant apps. Per-tenant identity (name, bundle id / application id, icons,
signing) comes from **iOS schemes** and **Android product flavors**; runtime branding comes from
the manifest (golden rule #5), so most tenant changes never need a rebuild — only identity-level
changes (new tenant app, icon, bundle id) do.

```
android: productFlavors { demoCasino { applicationId "com.example.democasino" ... } ... }
ios:     one scheme per tenant (DemoCasino.xcscheme) + per-scheme xcconfig (bundle id, name, icon)
```

## Android

1. **Keystore per tenant** (release signing — never committed):
   ```bash
   keytool -genkeypair -v -keystore democasino-release.keystore \
     -alias democasino -keyalg RSA -keysize 2048 -validity 10000
   ```
2. **Signing config from environment** in `android/app/build.gradle` — reference
   `RELEASE_STORE_FILE`, `RELEASE_STORE_PASSWORD`, `RELEASE_KEY_ALIAS`, `RELEASE_KEY_PASSWORD`
   from `~/.gradle/gradle.properties` locally and from CI secrets in pipelines. Keystores live in
   a secrets manager (or fastlane match-style encrypted storage), not the repo.
3. **Release build**: `cd android && ./gradlew bundle<Flavor>Release` → signed `.aab` (Play
   requires app bundles; APKs stay for internal distribution).

## iOS (requires macOS)

1. `cd ios && pod install` (CocoaPods pinned by `ios/Gemfile`; use `bundle exec pod install`).
2. **Certificates & profiles via fastlane match** — one shared encrypted cert repo, per-tenant
   app ids: `match appstore --app_identifier com.example.democasino`.
3. **Build**: `gym` (fastlane) with the tenant's scheme → signed `.ipa`.

## fastlane layout (when we wire it)

```
apps/mobile/fastlane/
  Appfile        # per-flavor app identifiers (or resolved from a tenant build config)
  Matchfile      # cert repo for iOS signing
  Fastfile:
    lane :android_beta do |opts|   # tenant flavor -> .aab -> Play internal track
      gradle(task: "bundle#{opts[:flavor]}Release", project_dir: "android")
      upload_to_play_store(track: "internal", ...)
    end
    lane :ios_beta do |opts|       # tenant scheme -> .ipa -> TestFlight
      match(type: "appstore", app_identifier: opts[:bundle_id])
      gym(scheme: opts[:scheme])
      upload_to_testflight
    end
```

Per-tenant release = `fastlane android_beta flavor:DemoCasino` / `fastlane ios_beta
scheme:DemoCasino` — the lane list grows with tenants, the lanes themselves don't change.

## CI shape for releases (later phase)

- Separate `release.yml` workflow triggered by tags (`v*` or `tenant/version`), running the
  fastlane lanes on `ubuntu-latest` (Android) and `macos-*` (iOS).
- Secrets per tenant: keystore (base64), keystore passwords, Play service-account JSON, App Store
  Connect API key, match passphrase.
- Store metadata (screenshots, descriptions) via `supply`/`deliver`, checked into
  `fastlane/metadata/<flavor>/` per tenant.

## Prerequisites checklist (before first store submission)

- [ ] Google Play developer account + Play App Signing enrollment per tenant app
- [ ] Apple Developer Program membership; app ids registered per tenant
- [ ] Keystore/cert storage decided (match repo or secrets manager)
- [ ] Android flavors + iOS schemes actually created for each launch tenant
- [ ] Privacy manifests / data-safety forms (location, BLE usage strings are already in the app)
