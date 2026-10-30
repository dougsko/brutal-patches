module.exports = {
  preset: 'ts-jest/presets/default',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js', 'json'],
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {}],
    '^.+\\.m?jsx?$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.m?js$))',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@nestjs/common$': '<rootDir>/src/test/nest-mocks/nest-common.mock.ts',
    '^@nestjs/swagger$': '<rootDir>/src/test/nest-mocks/swagger.mock.ts',
  },
  collectCoverageFrom: ['src/**/*.ts'],
  coverageDirectory: '../coverage',
  passWithNoTests: true,
};