import 'reflect-metadata';
import { REQUIRED_PERMISSIONS_KEY } from '../rbac/permissions.decorator';
import { SystemManagementController } from './system-management.controller';

const expectedPermissions = {
  createConfig: ['core:config:create'],
  createDept: ['core:dept:create'],
  createDict: ['core:dict:create'],
  createFileAsset: ['core:file:create'],
  createNotice: ['core:notice:create'],
  createPost: ['core:post:create'],
  deleteConfig: ['core:config:delete'],
  deleteDept: ['core:dept:delete'],
  deleteDict: ['core:dict:delete'],
  deleteFile: ['core:file:delete'],
  deleteNotice: ['core:notice:delete'],
  deletePost: ['core:post:delete'],
  exportAuditLogs: ['core:audit-log:export'],
  exportConfig: ['core:config:export'],
  exportDepts: ['core:dept:export'],
  exportDicts: ['core:dict:export'],
  exportFiles: ['core:file:export'],
  exportLoginLogs: ['core:login-log:export'],
  exportNotices: ['core:notice:export'],
  exportPosts: ['core:post:export'],
  getConfig: ['core:config:read'],
  getDept: ['core:dept:read'],
  getDict: ['core:dict:read'],
  getNotice: ['core:notice:read'],
  getPost: ['core:post:read'],
  archiveNotice: ['core:notice:update'],
  listAuditLogs: ['core:audit-log:read'],
  listConfig: ['core:config:read'],
  listDepts: ['core:dept:read'],
  listDicts: ['core:dict:read'],
  listFiles: ['core:file:read'],
  listLoginLogs: ['core:login-log:read'],
  listNotices: ['core:notice:read'],
  listPosts: ['core:post:read'],
  publishNotice: ['core:notice:update'],
  updateConfig: ['core:config:update'],
  updateDept: ['core:dept:update'],
  updateDict: ['core:dict:update'],
  updateFileAsset: ['core:file:update'],
  updateNotice: ['core:notice:update'],
  updatePost: ['core:post:update'],
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
