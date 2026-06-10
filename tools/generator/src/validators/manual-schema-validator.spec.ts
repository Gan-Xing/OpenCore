import { readOpenApiSnapshot } from '../readers/openapi-reader';
import { readModuleRegistrySnapshot } from '../readers/registry-reader';
import { loadManualSchema } from '../readers/schema-loader';
import { validateOpenForgeManualSchema } from './manual-schema-validator';

const registry = readModuleRegistrySnapshot();
const openApi = readOpenApiSnapshot();

function validateFixture(path: string, strictOpenApiTags = false) {
  const loaded = loadManualSchema(path);

  return validateOpenForgeManualSchema(loaded.schema, registry, openApi, {
    strictOpenApiTags,
  });
}

describe('OpenForge manual schema validator', () => {
  it('accepts the legal core dictionary schema in non-strict OpenAPI mode', () => {
    expect(
      validateFixture('tools/generator/examples/core.dict.schema.json'),
    ).toMatchObject({
      valid: true,
      errors: [],
    });
  });

  it('accepts V1 schemas with relations, indexes, filters, tests, docs, export, storage, and audit sections', () => {
    expect(
      validateFixture('tools/generator/examples/core.dict.v1.schema.json'),
    ).toMatchObject({
      valid: true,
      errors: [],
    });
    expect(
      validateFixture('tools/generator/examples/tool.openapi.v1.schema.json'),
    ).toMatchObject({
      valid: true,
      errors: [],
    });
  });

  it('rejects forbidden P4/P5 module schemas', () => {
    const result = validateFixture(
      'tools/generator/examples/invalid-p4-module.schema.json',
    );

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        'P4/P5 modules are forbidden in S9 OpenForge MVP inputs.',
      ]),
    );
  });

  it('rejects forbidden V1 P4/P5 module schemas', () => {
    const result = validateFixture(
      'tools/generator/examples/invalid-p4-module.v1.schema.json',
    );

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        'P4/P5 modules are forbidden in S9 OpenForge MVP inputs.',
      ]),
    );
  });

  it('rejects permission codes that drift from module resource', () => {
    const result = validateFixture(
      'tools/generator/examples/invalid-permission-code.schema.json',
    );

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.message)).toEqual(
      expect.arrayContaining(['Permission resource must be dict.']),
    );
  });

  it('rejects V1 permission codes that drift from module resource', () => {
    const result = validateFixture(
      'tools/generator/examples/invalid-permission.v1.schema.json',
    );

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.message)).toEqual(
      expect.arrayContaining(['Permission resource must be dict.']),
    );
  });

  it('reports OpenAPI tag mismatches clearly', () => {
    const result = validateFixture(
      'tools/generator/examples/missing-openapi-tag.schema.json',
      true,
    );

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        'OpenAPI tag must match the module registry apiTags.',
        'OpenAPI tag is missing from the snapshot in strict mode.',
      ]),
    );
  });

  it('reports V1 OpenAPI tag mismatches clearly', () => {
    const result = validateFixture(
      'tools/generator/examples/missing-openapi-tag.v1.schema.json',
      true,
    );

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        'OpenAPI tag must match the module registry apiTags.',
        'OpenAPI tag is missing from the snapshot in strict mode.',
      ]),
    );
  });

  it('rejects Prisma schema write requests', () => {
    const result = validateFixture(
      'tools/generator/examples/invalid-prisma-write.schema.json',
    );

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        'S9 OpenForge MVP must not request Prisma schema writes.',
      ]),
    );
  });

  it('rejects V1 Prisma schema write requests', () => {
    const result = validateFixture(
      'tools/generator/examples/invalid-prisma-write.v1.schema.json',
    );

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        'S9 OpenForge MVP must not request Prisma schema writes.',
      ]),
    );
  });

  it('rejects target path traversal', () => {
    const result = validateFixture(
      'tools/generator/examples/invalid-path-traversal.schema.json',
    );

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        'Target path must not traverse outside the repo.',
      ]),
    );
  });

  it('rejects V1 target path traversal across generated sections', () => {
    const result = validateFixture(
      'tools/generator/examples/invalid-path-traversal.v1.schema.json',
    );

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        'Target path must not traverse outside the repo.',
      ]),
    );
  });

  it('rejects V1 schemas for missing registry modules', () => {
    const result = validateFixture(
      'tools/generator/examples/missing-registry-module.v1.schema.json',
    );

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        'Module core.missing is not registered in module registry.',
        'Permission must be registered in module registry.',
      ]),
    );
  });
});
