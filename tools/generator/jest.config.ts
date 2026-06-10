export default {
  displayName: 'openforge',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleNameMapper: {
    '^@opencore/contracts$': '<rootDir>/../../packages/contracts/src/index.ts',
    '^@opencore/module-registry$':
      '<rootDir>/../../packages/module-registry/src/index.ts',
    '^@opencore/shared$': '<rootDir>/../../packages/shared/src/index.ts',
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/tools/generator',
};
