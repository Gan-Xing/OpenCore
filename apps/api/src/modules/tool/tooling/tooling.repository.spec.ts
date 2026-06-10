import { ToolingRepository } from './tooling.repository';

describe('ToolingRepository', () => {
  it('describes the OpenAPI drift check command', () => {
    expect(new ToolingRepository().getOpenApiDriftStatus()).toMatchObject({
      status: 'configured',
      exportCommand: 'pnpm openapi:export',
      driftCheckCommand: 'pnpm openapi:check',
    });
  });

  it('creates bounded current-page export plans', () => {
    expect(
      new ToolingRepository().createExportPlan({
        resource: 'files',
        columns: ['originalName', 'mimeType'],
        rowCount: 1200,
      }),
    ).toMatchObject({
      filename: 'opencore-files.csv',
      format: 'csv',
      scope: 'current-page',
      rowCount: 1000,
    });
  });
});
