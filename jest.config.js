/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: [
    '<rootDir>/src/**/*.test.{ts,tsx}',
    '<rootDir>/src/**/__tests__/**/*.{ts,tsx}',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/.expo/', '/dist/'],
  // jest-expo's default transformIgnorePatterns covers most RN deps,
  // but extend it for libs this project pulls in that ship untranspiled.
  // `immer` and `react-redux` are added here because their
  // `package.json#exports` resolve to legacy-esm builds under the
  // `react-native` condition (which jest-expo enables). Those files are
  // raw ESM and would otherwise fail to parse when @reduxjs/toolkit (which
  // depends on both) is imported in a test. See:
  //   src/__tests__/authTeardownClearsRefreshToken.test.ts (immer via RTK)
  //   src/__tests__/logoutResetsApiCache.test.ts (react-redux via RTK Query)
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native|@react-navigation|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-native-svg|nativewind|react-native-reanimated|react-native-css-interop|react-native-worklets|@react-native-community|immer|react-redux))',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/__tests__/**',
  ],
  coverageDirectory: 'coverage',
};
