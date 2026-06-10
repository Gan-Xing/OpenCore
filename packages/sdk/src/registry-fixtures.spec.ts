import {
  createMenuSummariesFromRegistry,
  createPermissionSummariesFromRegistry,
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
});
