import { existsSync } from 'node:fs';
import type { OpenForgeArtifactPlan } from '@opencore/contracts';
import { formatDiffPlanAsJson } from '../output/diff-output';
import { buildDiffPlan, evaluateArtifactDiff } from './diff-plan';

function createArtifact(
  overrides: Partial<OpenForgeArtifactPlan>,
): OpenForgeArtifactPlan {
  return {
    kind: 'docs.fragment',
    targetPath: 'docs/modules/generated.md',
    action: 'would-create',
    protected: false,
    overwritePolicy: 'generated-marker-required',
    contentHash: 'abc123',
    reason: 'Test artifact.',
    ...overrides,
  };
}

describe('OpenForge diff plan', () => {
  it('builds deterministic readonly diff entries', () => {
    const first = buildDiffPlan({
      schemaPath: 'tools/generator/examples/core.dict.schema.json',
    });
    const second = buildDiffPlan({
      schemaPath: 'tools/generator/examples/core.dict.schema.json',
    });

    expect(formatDiffPlanAsJson(first)).toBe(formatDiffPlanAsJson(second));
    expect(first.entries.map((entry) => entry.status)).toEqual(
      expect.arrayContaining(['would-create', 'protected-conflict']),
    );
    expect(first.safety.noWrite).toBe(true);
  });

  it('blocks protected paths', () => {
    expect(
      evaluateArtifactDiff(
        createArtifact({
          targetPath: 'prisma/schema.prisma',
          kind: 'prisma.hint',
        }),
      ),
    ).toMatchObject({
      status: 'protected-conflict',
      protected: true,
    });
  });

  it('blocks path traversal', () => {
    expect(
      evaluateArtifactDiff(createArtifact({ targetPath: '../outside.ts' })),
    ).toMatchObject({
      status: 'blocked',
      protected: false,
      reason: 'Path traversal is forbidden.',
    });
  });

  it('protects existing manual files without generated markers', () => {
    expect(
      evaluateArtifactDiff(createArtifact({ targetPath: 'README.md' })),
    ).toMatchObject({
      status: 'protected-conflict',
      protected: true,
    });
  });

  it('does not write generated target files while diffing', () => {
    const targetPath = 'apps/api/src/modules/core/dict/dict.module.ts';

    expect(existsSync(targetPath)).toBe(false);
    buildDiffPlan({
      schemaPath: 'tools/generator/examples/core.dict.schema.json',
    });
    expect(existsSync(targetPath)).toBe(false);
  });
});
