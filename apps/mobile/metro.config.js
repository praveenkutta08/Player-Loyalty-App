const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration — monorepo aware.
 *
 * The mobile app lives in a pnpm + Turborepo workspace and consumes `@repo/api-client` and
 * `@repo/shared-types` (compiled to their `dist/`). Metro must watch the repo root so it can read
 * those symlinked workspace packages, and resolve modules from both the app's and the root's
 * `node_modules` (the workspace uses a hoisted node_modules — see the root `.npmrc`).
 *
 * The workspace mixes React majors (admin 18, mobile 19); `react-redux` (pulled in via
 * `@repo/api-client`) can otherwise resolve a nested React 18, giving a duplicate-React "invalid
 * hook call" crash. `resolveRequest` pins every `react`/`react/*` import to the app's single
 * React 19 copy so there is exactly one React instance at runtime.
 *
 * https://reactnative.dev/docs/metro
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = {
  watchFolders: [workspaceRoot],
  resolver: {
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(workspaceRoot, 'node_modules'),
    ],
    resolveRequest: (context, moduleName, platform) => {
      if (moduleName === 'react' || moduleName.startsWith('react/')) {
        return {
          type: 'sourceFile',
          filePath: require.resolve(moduleName, { paths: [projectRoot] }),
        };
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);
