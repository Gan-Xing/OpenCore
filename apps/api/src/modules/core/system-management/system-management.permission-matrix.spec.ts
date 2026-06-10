import 'reflect-metadata';
import { REQUIRED_PERMISSIONS_KEY } from '../rbac/permissions.decorator';
import { SystemManagementController } from './system-management.controller';

const expectedPermissions = {
  createConfig: ['core:config:create'],
  createDict: ['core:dict:create'],
  createFileAsset: ['core:file:create'],
  deleteConfig: ['core:config:delete'],
  deleteDict: ['core:dict:delete'],
  deleteFile: ['core:file:delete'],
  exportAuditLogs: ['core:audit-log:export'],
  exportConfig: ['core:config:export'],
  exportDicts: ['core:dict:export'],
  exportFiles: ['core:file:export'],
  exportLoginLogs: ['core:login-log:export'],
  listAuditLogs: ['core:audit-log:read'],
  listConfig: ['core:config:read'],
  listDicts: ['core:dict:read'],
  listFiles: ['core:file:read'],
  listLoginLogs: ['core:login-log:read'],
  updateConfig: ['core:config:update'],
  updateDict: ['core:dict:update'],
} as const;

describe('SystemManagementController permission matrix', () => {
  it('guards every S7 route with registry permission codes', () => {
    for (const [methodName, permissions] of Object.entries(
      expectedPermissions,
    )) {
      expect(
        Reflect.getMetadata(
          REQUIRED_PERMISSIONS_KEY,
          SystemManagementController.prototype[
            methodName as keyof SystemManagementController
          ],
        ),
      ).toEqual(permissions);
    }
  });
});
