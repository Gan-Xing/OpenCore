import type { SdkRequest } from './rbac-client';
import { createToolingClient } from './tooling-client';

describe('createToolingClient', () => {
  it('uses stable S8 tool API paths', async () => {
    const calls: Array<{ path: string; method?: string }> = [];
    const request: SdkRequest = async (path, options) => {
      calls.push({
        path,
        method: options?.method,
      });
      return {} as never;
    };
    const client = createToolingClient(request);

    await client.getOpenApiDriftStatus('token');
    await client.getExportProtocol('token');
    await client.createExportPreview('token', {
      resource: 'dicts',
      columns: ['code', 'name'],
      rowCount: 2,
    });
    await client.getOpenForgeStatus('token');
    await client.getOpenForgeDoctor('token');
    await client.createOpenForgePlan('token', {
      schemaPath: 'tools/generator/examples/core.dict.v1.schema.json',
    });
    await client.createOpenForgeDiff('token', {
      schemaPath: 'tools/generator/examples/core.dict.v1.schema.json',
    });
    await client.createOpenForgePreflight('token', {
      schemaPath: 'tools/generator/examples/core.dict.v1.schema.json',
    });
    await client.createOpenForgeApplyDryRun('token', {
      schemaPath: 'tools/generator/examples/core.dict.v1.schema.json',
    });
    await client.listOpenForgeManifests('token');
    await client.getOpenForgeManifest('token', 'manifest-1');
    await client.createOpenForgeRollbackDryRun('token', {
      manifestId: 'manifest-1',
    });

    expect(calls).toEqual([
      {
        path: '/tools/openapi/drift',
      },
      {
        path: '/tools/export/protocol',
      },
      {
        path: '/tools/export/preview',
        method: 'POST',
      },
      {
        path: '/tools/openforge/status',
      },
      {
        path: '/tools/openforge/doctor',
      },
      {
        path: '/tools/openforge/plan',
        method: 'POST',
      },
      {
        path: '/tools/openforge/diff',
        method: 'POST',
      },
      {
        path: '/tools/openforge/check',
        method: 'POST',
      },
      {
        path: '/tools/openforge/apply/dry-run',
        method: 'POST',
      },
      {
        path: '/tools/openforge/manifests',
      },
      {
        path: '/tools/openforge/manifests/manifest-1',
      },
      {
        path: '/tools/openforge/rollback/dry-run',
        method: 'POST',
      },
    ]);
  });
});
