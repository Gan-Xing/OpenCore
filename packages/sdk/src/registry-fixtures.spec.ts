import {
  createAuditLogFixtures,
  createCurrentPageExportProtocolFixture,
  createDictFixtures,
  createExportPlanFixture,
  createFileAssetFixtures,
  createLoginLogFixtures,
  createMenuSummariesFromRegistry,
  createOpenApiDriftFixture,
  createPermissionSummariesFromRegistry,
  createQueueStatusFixture,
  createSystemConfigFixtures,
  createSystemStatusFixture,
  createVersionInfoFixture,
} from './registry-fixtures';

describe('registry fixtures', () => {
  it('keeps SDK permission and menu summaries traceable to registry codes', () => {
    const permissionCodes = new Set(
      createPermissionSummariesFromRegistry().map(
        (permission) => permission.code,
      ),
    );

    expect(permissionCodes.size).toBeGreaterThan(0);
    expect(permissionCodes.has('core:user:read')).toBe(true);

    for (const menu of createMenuSummariesFromRegistry()) {
      if (menu.permissionCode) {
        expect(permissionCodes.has(menu.permissionCode)).toBe(true);
      }
    }
  });

  it('creates S7 system-management fixtures with redacted audit data', () => {
    expect(createDictFixtures().items[0].code).toBe('system.status');
    expect(createSystemConfigFixtures().items[0].key).toBe(
      'opencore.admin.title',
    );
    expect(createFileAssetFixtures().items[0].storageKey).toContain(
      'file-assets/',
    );
    expect(createAuditLogFixtures().items[0].metadata).toMatchObject({
      password: '[REDACTED]',
    });
    expect(createLoginLogFixtures().items[0].success).toBe(true);
  });

  it('creates S8 monitor and tool fixtures without sensitive data', () => {
    expect(createSystemStatusFixture().dependencies[0].name).toBe('api');
    expect(JSON.stringify(createSystemStatusFixture())).not.toContain(
      'DATABASE_URL',
    );
    expect(createVersionInfoFixture().name).toBe('opencore-api');
    expect(createQueueStatusFixture().queues[0].readOnly).toBe(true);
    expect(createOpenApiDriftFixture().driftCheckCommand).toBe(
      'pnpm openapi:check',
    );
    expect(createCurrentPageExportProtocolFixture().asyncExport).toBe(false);
    expect(createExportPlanFixture().scope).toBe('current-page');
  });
});
