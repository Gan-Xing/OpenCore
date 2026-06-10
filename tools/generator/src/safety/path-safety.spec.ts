import { evaluatePathSafety, isProtectedPath } from './path-safety';

describe('OpenForge path safety', () => {
  it('blocks protected paths', () => {
    expect(isProtectedPath('.env')).toBe(true);
    expect(isProtectedPath('.env.opencore.local')).toBe(true);
    expect(isProtectedPath('prisma/schema.prisma')).toBe(true);
    expect(
      isProtectedPath('prisma/migrations/20260610180000/migration.sql'),
    ).toBe(true);
    expect(evaluatePathSafety('prisma/schema.prisma')).toMatchObject({
      blocked: true,
      protected: true,
    });
  });

  it('blocks absolute paths and traversal', () => {
    expect(evaluatePathSafety('/tmp/outside.ts')).toMatchObject({
      blocked: true,
      protected: false,
      reason: 'Absolute paths are forbidden.',
    });
    expect(evaluatePathSafety('../outside.ts')).toMatchObject({
      blocked: true,
      protected: false,
      reason: 'Path traversal is forbidden.',
    });
    expect(evaluatePathSafety('apps/api/../outside.ts')).toMatchObject({
      blocked: true,
      protected: false,
      reason: 'Path traversal is forbidden.',
    });
  });
});
