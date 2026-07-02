# Bundled fonts — SIL Open Font License 1.1

These families back the default theme's `fontFamily` tokens (`Manrope`, `Bodoni Moda`,
`JetBrains Mono`). Manifest typography tokens must name a font bundled here (or per flavor) —
unknown families silently fall back to system fonts.

| File                                            | Family                             | Source                                  |
| ----------------------------------------------- | ---------------------------------- | --------------------------------------- |
| `Manrope.ttf`, `Manrope_bold.ttf`               | Manrope (Mikhail Sharanda)         | google-webfonts-helper (latin, 400/700) |
| `Bodoni Moda.ttf`, `Bodoni Moda_bold.ttf`       | Bodoni Moda (indestructible type*) | google-webfonts-helper (latin, 400/700) |
| `JetBrains Mono.ttf`, `JetBrains Mono_bold.ttf` | JetBrains Mono (JetBrains)         | google-webfonts-helper (latin, 400/700) |

All are licensed under the [SIL Open Font License 1.1](https://openfontlicense.org/).

- **Android:** the same files are checked into `android/app/src/main/assets/fonts/` — React
  Native resolves `fontFamily` by asset filename (the `_bold` suffix serves `fontWeight: 700`).
- **iOS:** run `npx react-native-asset` on a Mac (or add the files + `UIAppFonts` Info.plist
  entries in Xcode) — filenames must match the families' PostScript names there.
