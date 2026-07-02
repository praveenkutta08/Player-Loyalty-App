/* Jest mocks for native modules used across the app so component tests run under Node. */
/* eslint-disable @typescript-eslint/no-require-imports */

// Secure storage (react-native-keychain) — in-memory stand-in.
jest.mock('react-native-keychain', () => {
  const store = {};
  return {
    setGenericPassword: jest.fn(async (username, password, opts) => {
      store[(opts && opts.service) || 'default'] = { username, password };
      return true;
    }),
    getGenericPassword: jest.fn(async (opts) => store[(opts && opts.service) || 'default'] || false),
    resetGenericPassword: jest.fn(async (opts) => {
      delete store[(opts && opts.service) || 'default'];
      return true;
    }),
  };
});

// AsyncStorage ships an official jest mock.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Lucide icons render via react-native-svg; stub every icon to a lightweight View.
jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  return new Proxy(
    {},
    {
      get: () => (props) => React.createElement(View, props),
    },
  );
});

// react-native-svg primitives → plain Views (in case anything imports them directly).
jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Stub = (props) => React.createElement(View, props, props.children);
  return new Proxy(
    { __esModule: true, default: Stub },
    { get: (target, key) => (key in target ? target[key] : Stub) },
  );
});
