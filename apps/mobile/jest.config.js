module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest.setup.js'],
  // The workspace mixes React majors (admin 18, mobile 19) and `react-redux` resolves a nested
  // React 18 via `@repo/api-client`'s peer. Pin every `react` import to the app's single React 19
  // copy so hooks share one dispatcher under test.
  moduleNameMapper: {
    '^react$': '<rootDir>/../../node_modules/react',
    '^react/(.*)$': '<rootDir>/../../node_modules/react/$1',
  },
  // Transform the ESM-only deps we pull in (lucide, workspace packages ship ESM) via babel.
  // pnpm keeps real package files under node_modules/.pnpm/<pkg>@<ver>/node_modules/<pkg>. Anchor
  // the allowlist to the `.pnpm/` segment and match by folder-name prefix (scoped names use `+`,
  // e.g. `@reduxjs+toolkit@2.12.0`). Anything ESM the app pulls in (RN, navigation, RTK, immer,
  // lucide) must be transformed; plain CJS deps stay ignored.
  transformIgnorePatterns: [
    'node_modules/\\.pnpm/(?!(@react-native|react-native|@react-navigation|@react-native-async-storage|@react-native-community|lucide-react-native|@repo|react-redux|@reduxjs|redux|immer|reselect|redux-thunk))',
  ],
};
