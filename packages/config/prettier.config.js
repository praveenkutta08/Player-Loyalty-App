/**
 * Shared Prettier config for the monorepo.
 * Consumed via each package.json `"prettier": "@repo/config/prettier"`.
 *
 * @type {import("prettier").Config}
 */
export default {
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  tabWidth: 2,
  endOfLine: 'lf',
};
