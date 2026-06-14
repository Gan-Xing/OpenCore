import 'reflect-metadata';
import {
  REQUIRED_PERMISSIONS_KEY,
  REQUIRE_AUTHENTICATED_KEY,
} from '../rbac/permissions.decorator';
import { SystemManagementController } from './system-management.controller';

const expectedPermissions = {
  createConfig: ['core:config:create'],
  createDept: ['core:dept:create'],
  createDict: ['core:dict:create'],
  createDictItem: ['core:dict:create'],
  createFileAsset: ['core:file:create'],
  createNotice: ['core:notice:create'],
  createNoticeFromTemplate: ['core:notice:create'],
  createNoticeTemplate: ['core:notice:create'],
  createPost: ['core:post:create'],
  deleteConfig: ['core:config:delete'],
  deleteConfigEnvironmentOverride: ['core:config:update'],
  deleteConfigs: ['core:config:delete'],
  deleteDept: ['core:dept:delete'],
  deleteDict: ['core:dict:delete'],
  deleteDictItem: ['core:dict:delete'],
  deleteFile: ['core:file:delete'],
  deleteAuditLogs: ['core:audit-log:delete'],
  deleteLoginLogs: ['core:login-log:delete'],
  downloadFile: ['core:file:read'],
  deleteNotice: ['core:notice:delete'],
  deleteNoticeTemplate: ['core:notice:delete'],
  deletePost: ['core:post:delete'],
  deletePosts: ['core:post:delete'],
  exportAuditLogs: ['core:audit-log:export'],
  exportConfig: ['core:config:export'],
  exportDepts: ['core:dept:export'],
  exportDicts: ['core:dict:export'],
  exportFiles: ['core:file:export'],
  exportLoginLogs: ['core:login-log:export'],
  exportNotices: ['core:notice:export'],
  exportPosts: ['core:post:export'],
  getAuditLog: ['core:audit-log:read'],
  getConfig: ['core:config:read'],
  getDept: ['core:dept:read'],
  getDict: ['core:dict:read'],
  getDictItem: ['core:dict:read'],
  getFile: ['core:file:read'],
  getLoginLog: ['core:login-log:read'],
  getNotice: ['core:notice:read'],
  getNoticeTemplate: ['core:notice:read'],
  getPost: ['core:post:read'],
  archiveNotice: ['core:notice:update'],
  listNoticeReadUsers: ['core:notice:read'],
  listNoticeTemplateOptions: ['core:notice:read'],
  listNoticeTemplates: ['core:notice:read'],
  listAuditLogs: ['core:audit-log:read'],
  listConfig: ['core:config:read'],
  listConfigEnvironmentOverrides: ['core:config:read'],
  listConfigSecretVersions: ['core:config:read'],
  listDepts: ['core:dept:read'],
  listDicts: ['core:dict:read'],
  listDictItems: ['core:dict:read'],
  listFiles: ['core:file:read'],
  listLoginLogs: ['core:login-log:read'],
  listNotices: ['core:notice:read'],
  listPosts: ['core:post:read'],
  cleanAuditLogs: ['core:audit-log:delete'],
  cleanLoginLogs: ['core:login-log:delete'],
  publishNotice: ['core:notice:update'],
  refreshConfigCache: ['core:config:update'],
  renderNoticeTemplate: ['core:notice:read'],
  rotateConfigSecret: ['core:config:update'],
  updateConfig: ['core:config:update'],
  upsertConfigEnvironmentOverride: ['core:config:update'],
  updateDept: ['core:dept:update'],
  updateDeptOrder: ['core:dept:update'],
  updateDict: ['core:dict:update'],
  updateDictItem: ['core:dict:update'],
  updateFileAsset: ['core:file:update'],
  uploadFileAsset: ['core:file:create'],
  unlockLoginUser: ['core:login-log:manage'],
  updateNotice: ['core:notice:update'],
  updateNoticeTemplate: ['core:notice:update'],
  updatePost: ['core:post:update'],
  updatePostOrder: ['core:post:update'],
} as const;

const expectedPublicConsumerMethods = [
  'getConfigRuntime',
  'getConfigValueByKey',
  'listDictDataOptions',
  'listDeptOptions',
  'listPostOptions',
] as const;

const expectedAuthenticatedConsumerMethods = [
  'countUnreadNoticeInbox',
  'getNoticeInboxItem',
  'listNoticeInbox',
  'listUnreadNoticeInbox',
  'markAllNoticesRead',
  'markNoticesRead',
  'streamNoticeInboxEvents',
] as const;

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

  it('keeps simple consumer routes free of management permissions', () => {
    for (const methodName of expectedPublicConsumerMethods) {
      expect(
        Reflect.getMetadata(
          REQUIRED_PERMISSIONS_KEY,
          SystemManagementController.prototype[methodName],
        ),
      ).toBeUndefined();
    }
  });

  it('keeps notice inbox routes authenticated without management permissions', () => {
    for (const methodName of expectedAuthenticatedConsumerMethods) {
      expect(
        Reflect.getMetadata(
          REQUIRED_PERMISSIONS_KEY,
          SystemManagementController.prototype[methodName],
        ),
      ).toBeUndefined();
      expect(
        Reflect.getMetadata(
          REQUIRE_AUTHENTICATED_KEY,
          SystemManagementController.prototype[methodName],
        ),
      ).toBe(true);
    }
  });
});
