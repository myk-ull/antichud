module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.env.js'],
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  transform: {
    // Override jest-expo's babel-jest entry to pass `preserveEnvVars: true` so
    // babel-preset-expo's `inline-env-vars` plugin is disabled in tests.
    // Without this, `process.env.EXPO_PUBLIC_*` is replaced with literals at
    // transform time, defeating per-test env var setup.
    '\\.[jt]sx?$': [
      'babel-jest',
      {
        caller: {
          name: 'metro',
          bundler: 'metro',
          platform: 'ios',
          preserveEnvVars: true,
        },
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-reanimated|@react-native-async-storage/.*))',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/.expo/', '/dist/', '/web-build/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
};
