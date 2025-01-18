/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleDirectories: ['node_modules', 'src'],
  testMatch: ['**/src/**/*.spec.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
    }],
    '^.+\\.js$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(double-metaphone|fastest-levenshtein)/)',
  ],
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
