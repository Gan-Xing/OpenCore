import {
  createAuditLogFixtures,
  createDictFixtures,
  createFileAssetFixtures,
  createLoginLogFixtures,
  createMenuSummariesFromRegistry,
  createPermissionSummariesFromRegistry,
  createSystemConfigFixtures,
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
});
