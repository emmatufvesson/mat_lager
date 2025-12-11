export default {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
  moduleFileExtensions: ['tsx', 'ts', 'js', 'mjs', 'cjs', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^@google/genai$': '<rootDir>/src/__mocks__/@google/genai.ts',
  },
  preset: 'ts-jest',
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        module: 'ESNext',
        target: 'ES2017',
      },
    }],
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
};