import {
  collectMenuTree,
  collectPermissionDefinitions,
} from '@opencore/module-registry';
import type {
  QueueStatusList,
  SystemStatusSummary,
  VersionInfoSummary,
} from './monitoring-types';
import type { MenuSummary, PermissionSummary } from './rbac-types';
import type {
  AuditLogSummary,
  DictTypeSummary,
  FileAssetSummary,
  LoginLogSummary,
  PageResponse,
  SystemConfigSummary,
  SystemDeptOptionSummary,
  SystemDeptTreeSummary,
  SystemNoticeSummary,
  SystemPostSummary,
} from './system-management-types';
import type {
  CurrentPageExportProtocolSummary,
  ExportPlanSummary,
  OpenApiDriftStatus,
} from './tooling-types';

export function createPermissionSummariesFromRegistry(): PermissionSummary[] {
  return collectPermissionDefinitions().map((permission) => ({
    code: permission.code,
    title: permission.title,
    stage: permission.stage,
    dangerous: permission.dangerous ?? false,
    system: true,
  }));
}

export function createMenuSummariesFromRegistry(): MenuSummary[] {
  return collectMenuTree().map((menu) => ({
    key: menu.key,
    parentKey: menu.parentKey,
    title: menu.title,
    type: menu.type ?? 'menu',
    path: menu.path,
    icon: menu.icon,
    component: menu.component,
    permissionCode: menu.permissionCode,
    stage: menu.stage,
    order: menu.order,
    status: menu.status ?? 'enabled',
    cache: menu.cache ?? false,
    hidden: menu.hidden ?? false,
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
      category: 'system',
      name: 'Admin title',
      key: 'opencore.admin.title',
      value: 'OpenCore Admin',
      valueType: 'string',
      description: 'Public Admin title.',
      remark: 'Shown in the Admin shell title.',
      public: true,
      system: true,
      visibility: 'public',
    },
    {
      id: 'config_login_lockout',
      category: 'security',
      name: 'Login lockout minutes',
      key: 'auth.login.lockoutMinutes',
      value: '15',
      valueType: 'number',
      description: 'Public login lockout runtime setting.',
      remark: 'Shown on the Admin login page as a runtime login policy.',
      public: true,
      system: true,
      visibility: 'public',
    },
    {
      id: 'config_login_max_failed_attempts',
      category: 'security',
      name: 'Login max failed attempts',
      key: 'auth.login.maxFailedAttempts',
      value: '5',
      valueType: 'number',
      description: 'Public login failed-attempt threshold runtime setting.',
      remark: 'Shown on the Admin login page as a runtime login policy.',
      public: true,
      system: true,
      visibility: 'public',
    },
    {
      id: 'config_jwt_secret_ref',
      category: 'security',
      name: 'JWT secret reference',
      key: 'auth.jwt.secretRef',
      value: '[redacted]',
      valueType: 'string',
      description: 'Secret runtime value is stored outside Admin fixtures.',
      remark: 'Secret-like values must remain redacted.',
      public: false,
      system: true,
      visibility: 'secret',
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
      storageKey: 'runtime/file-assets/opencore-readme.txt',
      checksum: 'sha256:readme',
      uploadedBy: 'admin',
      createdAt: '2026-06-10T00:00:00.000Z',
    },
  ]);
}

export function createSystemDeptFixtures(): readonly SystemDeptTreeSummary[] {
  return [
    {
      id: 'dept_headquarters',
      code: 'hq',
      name: 'Headquarters',
      order: 10,
      leader: 'OpenCore Admin',
      enabled: true,
      createdAt: '2026-06-10T00:00:00.000Z',
      updatedAt: '2026-06-10T00:00:00.000Z',
      children: [
        {
          id: 'dept_engineering',
          code: 'engineering',
          name: 'Engineering',
          parentId: 'dept_headquarters',
          order: 20,
          leader: 'Platform Lead',
          enabled: true,
          createdAt: '2026-06-10T00:05:00.000Z',
          updatedAt: '2026-06-10T00:05:00.000Z',
          children: [],
        },
        {
          id: 'dept_operations',
          code: 'operations',
          name: 'Operations',
          parentId: 'dept_headquarters',
          order: 30,
          leader: 'Operations Lead',
          enabled: true,
          createdAt: '2026-06-10T00:10:00.000Z',
          updatedAt: '2026-06-10T00:10:00.000Z',
          children: [],
        },
      ],
    },
  ];
}

export function createSystemDeptOptionFixtures(): readonly SystemDeptOptionSummary[] {
  return [
    {
      id: 'dept_headquarters',
      name: 'Headquarters',
      order: 10,
    },
    {
      id: 'dept_engineering',
      name: 'Engineering',
      parentId: 'dept_headquarters',
      order: 20,
    },
    {
      id: 'dept_operations',
      name: 'Operations',
      parentId: 'dept_headquarters',
      order: 30,
    },
  ];
}

export function createSystemPostFixtures(): PageResponse<SystemPostSummary> {
  return createPage([
    {
      id: 'post_admin',
      code: 'admin',
      name: 'Administrator',
      order: 10,
      description: 'System administration operator post.',
      enabled: true,
      createdAt: '2026-06-10T00:00:00.000Z',
      updatedAt: '2026-06-10T00:00:00.000Z',
    },
    {
      id: 'post_engineer',
      code: 'engineer',
      name: 'Engineer',
      order: 20,
      description: 'Engineering delivery post.',
      enabled: true,
      createdAt: '2026-06-10T00:05:00.000Z',
      updatedAt: '2026-06-10T00:05:00.000Z',
    },
  ]);
}

export function createSystemNoticeFixtures(): PageResponse<SystemNoticeSummary> {
  return createPage([
    {
      id: 'notice_welcome',
      title: 'Welcome to OpenCore',
      content: 'OpenCore system management is ready for internal operators.',
      type: 'announcement',
      status: 'published',
      audience: 'all',
      pinned: true,
      publishedAt: '2026-06-10T00:00:00.000Z',
      createdBy: 'admin',
      createdAt: '2026-06-10T00:00:00.000Z',
      updatedAt: '2026-06-10T00:00:00.000Z',
    },
    {
      id: 'notice_maintenance_window',
      title: 'Maintenance Window',
      content:
        'Planned maintenance announcements stay in draft until approved.',
      type: 'maintenance',
      status: 'draft',
      audience: 'admin',
      pinned: false,
      validFrom: '2026-06-12T02:00:00.000Z',
      validTo: '2026-06-12T03:00:00.000Z',
      createdBy: 'admin',
      createdAt: '2026-06-10T00:05:00.000Z',
      updatedAt: '2026-06-10T00:05:00.000Z',
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
      logType: 'login.username',
      result: 'success',
      success: true,
      ip: '127.0.0.1',
      userAgent: 'opencore-smoke',
      browser: 'OpenCore Smoke',
      os: 'Unknown',
      requestId: 'req_s7_seed_login',
      createdAt: '2026-06-10T00:00:00.000Z',
    },
  ]);
}

export function createSystemStatusFixture(): SystemStatusSummary {
  return {
    status: 'ok',
    checkedAt: '2026-06-10T00:00:00.000Z',
    uptimeSeconds: 42,
    dependencies: [
      {
        name: 'api',
        status: 'ok',
        latencyMs: 1,
        message: 'NestJS application is responding.',
      },
      {
        name: 'database',
        status: 'ok',
        latencyMs: 1,
        message: 'Prisma/PostgreSQL schema is configured.',
      },
      {
        name: 'queue',
        status: 'ok',
        latencyMs: 0,
        message: 'Read-only in-memory queue baseline is configured.',
      },
    ],
  };
}

export function createVersionInfoFixture(): VersionInfoSummary {
  return {
    name: 'opencore-api',
    version: '0.0.0',
    commit: 'unknown',
    buildTime: 'unknown',
    nodeVersion: 'v22.x',
  };
}

export function createQueueStatusFixture(): QueueStatusList {
  return {
    checkedAt: '2026-06-10T00:00:00.000Z',
    queues: [
      {
        name: 'system-audit',
        driver: 'bullmq-redis-readonly',
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        paused: false,
        readOnly: true,
      },
      {
        name: 'table-export',
        driver: 'bullmq-redis-readonly',
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        paused: false,
        readOnly: true,
      },
    ],
  };
}

export function createOpenApiDriftFixture(): OpenApiDriftStatus {
  return {
    status: 'configured',
    snapshotPath: 'packages/contracts/openapi/opencore-api.json',
    exportCommand: 'pnpm openapi:export',
    driftCheckCommand: 'pnpm openapi:check',
    checkedAt: '2026-06-10T00:00:00.000Z',
  };
}

export function createCurrentPageExportProtocolFixture(): CurrentPageExportProtocolSummary {
  return {
    stage: 'S8',
    status: 'active',
    scope: 'current-page',
    supportedFormats: ['csv'],
    maxRows: 1000,
    asyncExport: false,
    sensitiveFieldPolicy: 'exclude-sensitive-fields-before-export',
    ownerPackage: '@opencore/contracts',
  };
}

export function createExportPlanFixture(): ExportPlanSummary {
  const protocol = createCurrentPageExportProtocolFixture();

  return {
    resource: 'dicts',
    filename: 'opencore-dicts.csv',
    format: 'csv',
    scope: protocol.scope,
    columns: ['code', 'name', 'enabled'],
    rowCount: Math.min(2, protocol.maxRows),
    generatedAt: '2026-06-10T00:00:00.000Z',
  };
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
