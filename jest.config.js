module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.ts'],
  globals: true,
  'ts-jest': {
    tsconfig: 'tsconfig.json',
  },
}; 