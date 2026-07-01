# @repo/config

Shared build/lint/format configuration for the monorepo. Every JS/TS package extends these
instead of redefining their own.

## What's here

| File                 | Export                            | How to consume                                                                  |
| -------------------- | --------------------------------- | ------------------------------------------------------------------------------- |
| `tsconfig.base.json` | `@repo/config/tsconfig.base.json` | `{ "extends": "@repo/config/tsconfig.base.json" }` in a package `tsconfig.json` |
| `eslint.config.js`   | `@repo/config/eslint`             | `import config from '@repo/config/eslint'; export default config;`              |
| `prettier.config.js` | `@repo/config/prettier`           | `"prettier": "@repo/config/prettier"` in a package `package.json`               |

## Notes

- ESLint uses the flat-config format (ESLint 9) with `typescript-eslint` and deterministic
  `import/order`.
- The base tsconfig is `strict` with `noUncheckedIndexedAccess` and `verbatimModuleSyntax`.
- This is config-only scaffolding; it ships no runtime code.
