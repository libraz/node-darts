/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable import/no-commonjs */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/', '<rootDir>/tests/'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  // Use environment variable for workers or default to 4
  maxWorkers: process.env.JEST_WORKERS || 4,
  // Increase timeout
  testTimeout: 30000,
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/**/index.ts'],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 95,
      lines: 85,
      statements: 85,
    },
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};
