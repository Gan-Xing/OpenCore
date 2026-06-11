import { formatPlanAsJson, formatPlanAsMarkdown } from '../output/plan-output';
import { buildGeneratePlan } from './generate-plan';

describe('OpenForge generate plan', () => {
  it('builds a deterministic plan for the core dictionary schema', () => {
    const firstPlan = buildGeneratePlan({
      schemaPath: 'tools/generator/examples/core.dict.schema.json',
    });
    const secondPlan = buildGeneratePlan({
      schemaPath: 'tools/generator/examples/core.dict.schema.json',
    });

    expect(formatPlanAsJson(firstPlan)).toBe(formatPlanAsJson(secondPlan));
    expect(firstPlan).toMatchObject({
      moduleCode: 'core.dict',
      templateVersion: 's9-openforge-mvp-v1',
      errors: [],
      safety: {
        noWrite: true,
        dryRunOnly: true,
        blockPrismaSchemaWrites: true,
      },
    });
  });

  it('lists API, Admin, SDK, test, docs, and Prisma hint artifacts', () => {
    const plan = buildGeneratePlan({
      schemaPath: 'tools/generator/examples/core.dict.schema.json',
    });

    expect(plan.artifacts.map((artifact) => artifact.kind)).toEqual(
      expect.arrayContaining([
        'api.module',
        'api.controller',
        'api.service',
        'api.dto',
        'api.repository',
        'admin.listPage',
        'admin.form',
        'admin.detail',
        'sdk.client',
        'test.api',
        'test.admin',
        'docs.fragment',
        'prisma.hint',
      ]),
    );

    for (const artifact of plan.artifacts) {
      expect(artifact.targetPath).toBeTruthy();
      expect(artifact.reason).toBeTruthy();
      expect(artifact.contentHash || artifact.contentPreview).toBeTruthy();
      expect(artifact.overwritePolicy).toBeTruthy();
    }
  });

  it('formats the plan as markdown without adding nondeterministic content', () => {
    const plan = buildGeneratePlan({
      schemaPath: 'tools/generator/examples/core.dict.schema.json',
    });

    expect(formatPlanAsMarkdown(plan)).toContain(
      '# OpenForge Generate Plan: core.dict',
    );
    expect(formatPlanAsMarkdown(plan)).toContain('Dry run only: true');
  });
});
