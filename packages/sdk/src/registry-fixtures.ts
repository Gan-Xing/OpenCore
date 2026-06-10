import {
  collectMenus,
  collectPermissionDefinitions,
} from '@opencore/module-registry';
import type { MenuSummary, PermissionSummary } from './rbac-types';
import type {
  AuditLogSummary,
  DictTypeSummary,
  FileAssetSummary,
  LoginLogSummary,
  PageResponse,
  SystemConfigSummary,
} from './system-management-types';

export function createPermissionSummariesFromRegistry(): PermissionSummary[] {
  return collectPermissionDefinitions().map((permission) => ({
    code: permission.code,
    title: permission.title,
    stage: permission.stage,
    dangerous: permission.dangerous ?? false,
  }));
}

export function createMenuSummariesFromRegistry(): MenuSummary[] {
  return collectMenus().map((menu) => ({
    key: menu.key,
    title: menu.title,
    path: menu.path,
    permissionCode: menu.permissionCode,
    stage: menu.stage,
    order: menu.order,
  }));
}

export function createDictFixtures(): PageResponse<DictTypeSummary> {
  return createPage([
    {
      id: 'dict_system_status',
      code: 'system.status',
      name: 'System Status',
      description: 'Shared status labels for enabled and disabled records.',
      enabled: true,
      items: [
        {
          id: 'dict_item_enabled',
          label: 'Enabled',
          value: 'enabled',
          sort: 10,
          enabled: true,
        },
        {
          id: 'dict_item_disabled',
          label: 'Disabled',
          value: 'disabled',
          sort: 20,
          enabled: true,
        },
      ],
    },
  ]);
}

export function createSystemConfigFixtures(): PageResponse<SystemConfigSummary> {
  return createPage([
    {
      id: 'config_admin_title',
      key: 'opencore.admin.title',
      value: 'OpenCore Admin',
      valueType: 'string',
      description: 'Public Admin title.',
      public: true,
    },
    {
      id: 'config_login_lockout',
      key: 'auth.login.lockoutMinutes',
      value: '15',
      valueType: 'number',
      description: 'Safe login lockout display setting.',
      public: false,
    },
  ]);
}

export function createFileAssetFixtures(): PageResponse<FileAssetSummary> {
  return createPage([
    {
      id: 'file_readme',
      originalName: 'opencore-readme.txt',
      mimeType: 'text/plain',
      sizeBytes: 512,
      storageKey: 'file-assets/opencore-readme.txt',
      checksum: 'sha256:readme',
      uploadedBy: 'admin',
      createdAt: '2026-06-10T00:00:00.000Z',
    },
  ]);
}

export function createAuditLogFixtures(): PageResponse<AuditLogSummary> {
  return createPage([
    {
      id: 'audit_admin_login',
      actorUsername: 'admin',
      action: 'login',
      resource: 'auth',
      resourceId: 'user_admin',
      method: 'POST',
      path: '/api/auth/login',
      statusCode: 200,
      ip: '127.0.0.1',
      userAgent: 'opencore-smoke',
      requestId: 'req_s7_seed_login',
      metadata: {
        username: 'admin',
        password: '[REDACTED]',
      },
      createdAt: '2026-06-10T00:00:00.000Z',
    },
  ]);
}

export function createLoginLogFixtures(): PageResponse<LoginLogSummary> {
  return createPage([
    {
      id: 'login_success_admin',
      username: 'admin',
      success: true,
      ip: '127.0.0.1',
      userAgent: 'opencore-smoke',
      requestId: 'req_s7_seed_login',
      createdAt: '2026-06-10T00:00:00.000Z',
    },
  ]);
}

function createPage<T>(items: readonly T[]): PageResponse<T> {
  return {
    items,
    page: 1,
    pageSize: 10,
    total: items.length,
    totalPages: items.length === 0 ? 0 : 1,
  };
}
