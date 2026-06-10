import { runOpenForgeDoctor } from './openforge-doctor';

describe('OpenForge doctor', () => {
  it('checks workspace readiness without requiring existing manifests', () => {
    const result = runOpenForgeDoctor();

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.checks.map((check) => check.id)).toEqual([
      'workspace-root',
      'pnpm-workspace',
      'nx-project',
      'contracts-export',
      'module-registry-validation',
      'openapi-snapshot',
      'openapi-drift-command',
      'example-schemas',
      'template-packs',
      'protected-paths-config',
      'manifest-directory-status',
    ]);
    expect(result.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'example-schemas',
          status: 'pass',
        }),
        expect.objectContaining({
          id: 'protected-paths-config',
          status: 'pass',
        }),
        expect.objectContaining({
          id: 'manifest-directory-status',
          status: 'pass',
        }),
      ]),
    );
  });
});
