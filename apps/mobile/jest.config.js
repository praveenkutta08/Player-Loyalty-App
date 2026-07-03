module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest.setup.js'],
  // The workspace mixes React majors (admin 18, mobile 19) and `react-redux` resolves a nested
  // React 18 via `@repo/api-client`'s peer. Pin every `react` import to the app's single React 19
  // copy so hooks share one dispatcher under test.
  moduleNameMapper: {
    '^react$': '<rootDir>/../../node_modules/react',
    '^react/(.*)$': '<rootDir>/../../node_modules/react/$1',
    // The dotenv babel plugin is off under test (babel.config.js); resolve the `@env` virtual
    // module to a deterministic stub so coverage instrumentation can't break the import.
    '^@env$': '<rootDir>/__mocks__/env.js',
  },
  // Transform the ESM-only deps we pull in (lucide, workspace packages ship ESM) via babel.
  // pnpm keeps real package files under node_modules/.pnpm/<pkg>@<ver>/node_modules/<pkg>. Anchor
  // the allowlist to the `.pnpm/` segment and match by folder-name prefix (scoped names use `+`,
  // e.g. `@reduxjs+toolkit@2.12.0`). Anything ESM the app pulls in (RN, navigation, RTK, immer,
  // lucide) must be transformed; plain CJS deps stay ignored.
  transformIgnorePatterns: [
    'node_modules/\\.pnpm/(?!(@react-native|react-native|@react-navigation|@react-native-async-storage|@react-native-community|lucide-react-native|@repo|react-redux|@reduxjs|redux|immer|reselect|redux-thunk))',
  ],
  // Coverage (opt-in via `pnpm test:coverage`) focuses on the logic units the suites exercise —
  // slices, API builders, and pure helpers — not presentational screens/navigators.
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*Screen.tsx',
    '!src/**/*Navigator.tsx',
    '!src/**/index.ts',
  ],
  coverageDirectory: '<rootDir>/coverage',
  // Coverage floor (R21) — a ratchet set below current (~67% stmts) so it guards against
  // regressions without being brittle. Enforced in CI via `pnpm test:coverage`. Raise as coverage
  // grows; never lower to make a red build pass.
  coverageThreshold: {
    global: { statements: 60, branches: 50, functions: 50, lines: 60 },
  },
};
