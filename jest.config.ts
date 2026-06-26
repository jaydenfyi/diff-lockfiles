import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  // Only *.test.ts files are tests — lets us keep non-test helpers (e.g.
  // helpers.ts) under __tests__/ without jest trying to execute them.
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      { useESM: true, tsconfig: 'tsconfig.test.json' },
    ],
  },
};

export default config;
