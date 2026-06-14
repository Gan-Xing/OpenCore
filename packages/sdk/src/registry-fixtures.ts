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
  SystemNoticeTemplateSummary,
  SystemPostSummary,
} from './system-management-types';
import type {
  CurrentPageExportProtocolSummary,
  ExportPlanSummary,
  OpenApiDriftStatus,
  OpenForgeApplyDryRunSummary,
  OpenForgeDiffSummary,
  OpenForgeDoctorSummary,
  OpenForgeManifestListSummary,
  OpenForgePlanSummary,
  OpenForgePreflightSummary,
  OpenForgeStatusSummary,
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
      encrypted: false,
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
      encrypted: false,
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
      encrypted: false,
      remark: 'Shown on the Admin login page as a runtime login policy.',
      public: true,
      system: true,
      visibility: 'public',
    },
    {
      id: 'config_feature_notice_inbox_enabled',
      category: 'feature',
      name: 'Notice inbox feature flag',
      key: 'feature.notice.inbox.enabled',
      value: 'true',
      valueType: 'boolean',
      description: 'Public runtime feature flag for the notice inbox surface.',
      encrypted: false,
      remark: 'Returned by the runtime config featureFlags map.',
      public: true,
      system: true,
      visibility: 'public',
    },
    {
      id: 'config_feature_notice_inbox_rollout',
      category: 'feature',
      name: 'Notice inbox rollout percentage',
      key: 'feature.notice.inbox.rolloutPercentage',
      value: '100',
      valueType: 'number',
      description:
        'Public rollout percentage for the notice inbox feature flag.',
      encrypted: false,
      remark: 'Returned by the runtime config featureFlagRules map.',
      public: true,
      system: true,
      visibility: 'public',
    },
    {
      id: 'config_feature_notice_inbox_audience',
      category: 'feature',
      name: 'Notice inbox audience rules',
      key: 'feature.notice.inbox.audienceRules',
      value: '{"mode":"all","rules":[]}',
      valueType: 'json',
      description: 'Public runtime audience targeting rules for notice inbox.',
      encrypted: false,
      remark: 'Returned by the runtime config featureFlagRules map.',
      public: true,
      system: true,
      visibility: 'public',
    },
    {
      id: 'config_jwt_secret_ref',
      category: 'security',
      name: 'JWT secret reference',
      key: 'auth.jwt.secretRef',
      value: '[REDACTED]',
      valueType: 'string',
      description: 'Secret runtime value is stored outside Admin fixtures.',
      encrypted: true,
      remark: 'Secret-like values must remain redacted.',
      public: false,
      system: true,
      visibility: 'secret',
    },
    {
      id: 'config_integration_mail_smtp_password',
      category: 'integration',
      name: 'Mail SMTP password',
      key: 'integration.mail.smtp.password.secret',
      value: '[REDACTED]',
      valueType: 'string',
      description:
        'Secret password used by the default disabled SMTP provider.',
      encrypted: true,
      remark:
        'Runtime SMTP adapters resolve this value only through secretRef.',
      public: false,
      system: true,
      visibility: 'secret',
    },
    {
      id: 'config_integration_sms_http_api_key',
      category: 'integration',
      name: 'SMS HTTP API key',
      key: 'integration.sms.http.api-key.secret',
      value: '[REDACTED]',
      valueType: 'string',
      description: 'Secret API key used by SMS HTTP provider injection.',
      encrypted: true,
      remark:
        'Runtime SMS HTTP adapters inject this value only through secretRef.',
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

export function createSystemNoticeTemplateFixtures(): PageResponse<SystemNoticeTemplateSummary> {
  return createPage([
    {
      id: 'notice_template_release_window',
      code: 'release.window',
      name: 'Release Window',
      type: 'announcement',
      titleTemplate: 'Release window: {{version}}',
      contentTemplate:
        'Version {{version}} is scheduled for {{window}}. Owner: {{owner}}.',
      params: ['owner', 'version', 'window'],
      enabled: true,
      remark: 'Seeded template for release-window announcements.',
      createdAt: '2026-06-10T00:00:00.000Z',
      updatedAt: '2026-06-10T00:00:00.000Z',
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
      location: 'Loopback',
      userAgent: 'opencore-smoke',
      requestId: 'req_s7_seed_login',
      durationMs: 12,
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
      actorUsername: 'admin',
      reason: 'seed login success',
      ip: '127.0.0.1',
      location: 'Loopback',
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
        name: 'maintenance',
        driver: 'bullmq-redis-readonly',
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        paused: false,
        readOnly: true,
      },
      {
        name: 'reports',
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

function createOpenForgeSafetyFixture() {
  return {
    noWrite: true,
    dryRunOnly: true,
    protectedPaths: [
      '.env',
      '.env.*',
      '.env.opencore.local',
      'prisma/schema.prisma',
      'prisma/migrations/**',
    ],
    forbiddenPathPatterns: ['/**', '../**'],
    requireGeneratedMarkerForUpdate: true,
    blockPrismaSchemaWrites: true,
    blockPrismaMigrations: true,
    blockP4P5Modules: true,
  } as const;
}

export function createOpenForgeStatusFixture(): OpenForgeStatusSummary {
  return {
    status: 'workspace-ready',
    message:
      'OpenForge is available as a guarded planning and dry-run workspace.',
    workspace: {
      packageName: '@opencore/openforge',
      projectName: 'openforge',
      templateVersion: 's9-openforge-mvp-v1',
      protocol: {
        stage: 'S9',
        status: 'read-only-plan',
        noWrite: true,
      },
      noWrite: true,
    },
    generatorCore: {
      packageName: '@opencore/generator-core',
      projectName: 'generator-core',
      templateVersion: 's9-openforge-mvp-v1',
      protocol: {
        stage: 'S9',
        status: 'read-only-plan',
        noWrite: true,
      },
      noWrite: true,
    },
  };
}

export function createOpenForgeDoctorFixture(): OpenForgeDoctorSummary {
  return {
    generatedAt: '2026-06-10T00:00:00.000Z',
    repoRoot: '/home/ubuntu/dev/opencore',
    valid: true,
    checks: [
      {
        id: 'workspace-root',
        label: 'Workspace root',
        status: 'pass',
        message: 'Workspace root is readable.',
      },
      {
        id: 'template-packs',
        label: 'Template packs',
        status: 'pass',
        message: 'Default template pack renders safely.',
      },
    ],
    errors: [],
  };
}

export function createOpenForgePlanFixture(): OpenForgePlanSummary {
  return {
    moduleCode: 'core.dict',
    templateVersion: 's9-openforge-mvp-v1',
    schemaHash: 'openforge-fixture-schema',
    openApiSnapshotHash: 'openforge-fixture-openapi',
    registrySnapshotHash: 'openforge-fixture-registry',
    artifacts: [
      {
        kind: 'api.controller',
        targetPath: 'apps/api/src/modules/core/dict/dict.controller.ts',
        action: 'would-create',
        protected: false,
        overwritePolicy: 'generated-marker-required',
        contentHash: 'fixture-api-controller',
        reason: 'Controller skeleton aligned with manual schema actions.',
      },
      {
        kind: 'prisma.hint',
        targetPath: 'prisma/schema.prisma',
        action: 'hint',
        protected: true,
        overwritePolicy: 'never',
        contentHash: 'fixture-prisma-hint',
        reason: 'Prisma changes are manual review hints only in S9.',
      },
    ],
    permissions: ['core:dict:read', 'core:dict:create'],
    openapiTags: ['Core System Management'],
    warnings: [],
    errors: [],
    safety: createOpenForgeSafetyFixture(),
  };
}

export function createOpenForgeDiffFixture(): OpenForgeDiffSummary {
  return {
    moduleCode: 'core.dict',
    templateVersion: 's9-openforge-mvp-v1',
    generatedAt: '2026-06-10T00:00:00.000Z',
    entries: [
      {
        targetPath: 'apps/api/src/modules/core/dict/dict.controller.ts',
        kind: 'api.controller',
        status: 'would-create',
        protected: false,
        reason: 'Target path does not exist; OpenForge would create it later.',
        afterHash: 'fixture-api-controller',
      },
      {
        targetPath: 'prisma/schema.prisma',
        kind: 'prisma.hint',
        status: 'protected-conflict',
        protected: true,
        reason: 'Protected path is blocked by safety policy.',
        afterHash: 'fixture-prisma-hint',
      },
    ],
    warnings: [],
    errors: [],
    safety: createOpenForgeSafetyFixture(),
  };
}

export function createOpenForgePreflightFixture(): OpenForgePreflightSummary {
  return {
    templateVersion: 's9-openforge-mvp-v1',
    generatedAt: '2026-06-10T00:00:00.000Z',
    schemaPath: 'tools/generator/examples/core.dict.v1.schema.json',
    moduleCode: 'core.dict',
    valid: true,
    noWrite: true,
    registry: {
      valid: true,
      moduleCount: 1,
      permissionCount: 2,
      menuCount: 1,
      issueCount: 0,
    },
    openApi: {
      snapshotPath: 'packages/contracts/openapi/opencore-api.json',
      pathCount: 1,
      operationCount: 1,
      tagCount: 1,
      schemaCount: 1,
    },
    safety: createOpenForgeSafetyFixture(),
    warnings: [],
    errors: [],
  };
}

export function createOpenForgeApplyDryRunFixture(): OpenForgeApplyDryRunSummary {
  const plan = createOpenForgePlanFixture();

  return {
    mode: 'dry-run',
    applied: false,
    manifest: {
      id: 'openforge-fixture-manifest',
      createdAt: '2026-06-10T00:00:00.000Z',
      command:
        'pnpm openforge:apply -- --schema tools/generator/examples/core.dict.v1.schema.json --dry-run',
      schemaPath: 'tools/generator/examples/core.dict.v1.schema.json',
      moduleCode: plan.moduleCode,
      templateVersion: plan.templateVersion,
      inputHashes: {
        schemaHash: plan.schemaHash,
        registryHash: plan.registrySnapshotHash,
        openApiHash: plan.openApiSnapshotHash,
      },
      entries: [],
    },
    entries: [],
    warnings: [],
    errors: [],
  };
}

export function createOpenForgeManifestListFixture(): OpenForgeManifestListSummary {
  return {
    manifests: [
      {
        id: 'openforge-fixture-manifest',
        path: '.openforge/manifests/openforge-fixture-manifest.json',
        createdAt: '2026-06-10T00:00:00.000Z',
        moduleCode: 'core.dict',
        templateVersion: 's9-openforge-mvp-v1',
        entryCount: 0,
      },
    ],
    warnings: [],
    errors: [],
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
