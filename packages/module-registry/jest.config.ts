export default {
  displayName: 'module-registry',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleNameMapper: {
    '^@opencore/contracts$': '<rootDir>/../contracts/src/index.ts',
    '^@opencore/shared$': '<rootDir>/../shared/src/index.ts',
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/packages/module-registry',
};
