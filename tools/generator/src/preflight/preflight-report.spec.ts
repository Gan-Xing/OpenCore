import { buildPreflightReport } from './preflight-report';

describe('OpenForge preflight report', () => {
  it('reports registry, OpenAPI, schema, and safety status', () => {
    expect(
      buildPreflightReport({
        schemaPath: 'tools/generator/examples/core.dict.schema.json',
      }),
    ).toMatchObject({
      moduleCode: 'core.dict',
      valid: true,
      noWrite: true,
      registry: {
        valid: true,
      },
      safety: {
        noWrite: true,
        blockP4P5Modules: true,
        blockPrismaSchemaWrites: true,
      },
      errors: [],
    });
  });
});
