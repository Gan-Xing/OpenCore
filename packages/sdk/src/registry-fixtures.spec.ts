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
  createSystemDeptOptionFixtures,
  createSystemNoticeTemplateFixtures,
  createSystemStatusFixture,
  createVersionInfoFixture,
} from './registry-fixtures';
import {
  findApprovalLiteFixture,
  findMessageFixture,
  findNoticeFixture,
  findTodoFixture,
} from './collaboration-types';
import {
  findExportJobDesignFixture,
  findJobFixture,
  findJobRunFixture,
  findOnlineUserFixture,
  findReportFixture,
} from './operations-types';
import {
  findIntegrationDesignFixture,
  findIntegrationOutboxFixture,
  findIntegrationProviderDiagnosticsFixture,
  findIntegrationProviderFixture,
  findIntegrationTemplateFixture,
  findOAuthCallbackContractFixture,
} from './integration-types';

describe('registry fixtures', () => {
  it('keeps SDK permission and menu summaries traceable to registry codes', () => {
    const permissionCodes = new Set(
      createPermissionSummariesFromRegistry().map(
        (permission) => permission.code,
      ),
    );

    expect(permissionCodes.size).toBeGreaterThan(0);
    expect(permissionCodes.has('core:user:read')).toBe(true);
    expect(permissionCodes.has('core:user:import')).toBe(true);
    expect(permissionCodes.has('core:user:manage')).toBe(true);

    for (const menu of createMenuSummariesFromRegistry()) {
      if (menu.permissionCode) {
        expect(permissionCodes.has(menu.permissionCode)).toBe(true);
      }
    }

    expect(createMenuSummariesFromRegistry()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'system',
          type: 'directory',
          status: 'enabled',
        }),
        expect.objectContaining({
          key: 'system.menus',
          parentKey: 'system',
          component: 'System/Menus',
        }),
      ]),
    );
  });

  it('creates S7 system-management fixtures with redacted audit data', () => {
    expect(createDictFixtures().items[0].code).toBe('system.status');
    expect(createSystemConfigFixtures().items[0].key).toBe(
      'opencore.admin.title',
    );
    expect(createSystemConfigFixtures().items[0].visibility).toBe('public');
    expect(
      createSystemConfigFixtures().items.some(
        (item) =>
          item.key === 'auth.login.maxFailedAttempts' &&
          item.value === '5' &&
          item.valueType === 'number' &&
          item.encrypted === false &&
          item.visibility === 'public',
      ),
    ).toBe(true);
    expect(
      createSystemConfigFixtures().items.some(
        (item) =>
          item.category === 'feature' &&
          item.key === 'feature.notice.inbox.enabled' &&
          item.value === 'true' &&
          item.valueType === 'boolean' &&
          item.encrypted === false &&
          item.visibility === 'public',
      ),
    ).toBe(true);
    expect(
      createSystemConfigFixtures().items.some(
        (item) =>
          item.category === 'feature' &&
          item.key === 'feature.notice.inbox.rolloutPercentage' &&
          item.value === '100' &&
          item.valueType === 'number' &&
          item.encrypted === false &&
          item.visibility === 'public',
      ),
    ).toBe(true);
    expect(
      createSystemConfigFixtures().items.some(
        (item) =>
          item.category === 'feature' &&
          item.key === 'feature.notice.inbox.audienceRules' &&
          item.value === '{"mode":"all","rules":[]}' &&
          item.valueType === 'json' &&
          item.encrypted === false &&
          item.visibility === 'public',
      ),
    ).toBe(true);
    expect(
      createSystemConfigFixtures().items.find(
        (item) => item.visibility === 'secret',
      ),
    ).toMatchObject({
      encrypted: true,
      value: '[REDACTED]',
    });
    expect(createFileAssetFixtures().items[0].storageKey).toContain(
      'file-assets/',
    );
    expect(createAuditLogFixtures().items[0].metadata).toMatchObject({
      password: '[REDACTED]',
    });
    expect(createLoginLogFixtures().items[0].success).toBe(true);
    expect(createSystemDeptOptionFixtures()[1]).toMatchObject({
      id: 'dept_engineering',
      parentId: 'dept_headquarters',
    });
    expect(createSystemNoticeTemplateFixtures().items[0]).toMatchObject({
      code: 'release.window',
      params: ['owner', 'version', 'window'],
    });
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

  it('resolves S10 collaboration fixture details by detail route keys', () => {
    expect(findMessageFixture('msg_welcome_admin')?.status).toBe('unread');
    expect(findNoticeFixture('notice_release_window')?.status).toBe('draft');
    expect(findTodoFixture('todo_review_openforge')?.timeline).toHaveLength(1);
    expect(findApprovalLiteFixture('approval_openforge_apply')?.status).toBe(
      'pending',
    );
    expect(findMessageFixture('missing')).toBeUndefined();
  });

  it('resolves S11 operations fixture details by scoped keys', () => {
    expect(findJobFixture('openapi.drift-check')?.enabled).toBe(true);
    expect(
      findJobRunFixture('openapi.drift-check', 'run_openapi_drift_1')?.status,
    ).toBe('completed');
    expect(
      findJobRunFixture('wrong.job', 'run_openapi_drift_1'),
    ).toBeUndefined();
    expect(findOnlineUserFixture('session_admin')?.username).toBe('admin');
    expect(findReportFixture('runtime.health')?.owner).toBe('admin');
    expect(findExportJobDesignFixture('async-export-job')?.status).toBe(
      'design-only',
    );
  });

  it('resolves S12 integration fixture details without exposing secrets', () => {
    expect(
      findIntegrationProviderFixture('mail.sandbox')?.config,
    ).toMatchObject({ clientSecret: '[REDACTED]' });
    expect(
      findIntegrationTemplateFixture('mail', 'mail.welcome')?.enabled,
    ).toBe(true);
    expect(findIntegrationTemplateFixture('sms', 'sms.otp')?.channel).toBe(
      'sms',
    );
    expect(
      findIntegrationOutboxFixture('mail', 'outbox_mail_1')?.providerCode,
    ).toBe('mail.sandbox');
    expect(
      findIntegrationOutboxFixture('sms', 'outbox_mail_1'),
    ).toBeUndefined();
    expect(
      findIntegrationProviderDiagnosticsFixture('mail.sandbox')?.outbox.queued,
    ).toBe(1);
    expect(
      findIntegrationProviderDiagnosticsFixture('mail.sandbox')?.readiness,
    ).toBe('blocked');
    expect(
      findOAuthCallbackContractFixture(
        '/api/integrations/oauth/callback/:providerCode',
      )?.stateTtlSeconds,
    ).toBe(300);
    expect(findIntegrationDesignFixture('wechat')?.status).toBe('design-only');
  });
});
