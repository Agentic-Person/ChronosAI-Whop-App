const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: [
    '<rootDir>/tests/integration/**/*.test.ts',
    '<rootDir>/tests/integration/**/*.test.tsx',
  ],
  testTimeout: 30000, // Integration tests may take longer
}

module.exports = createJestConfig(customJestConfig)
