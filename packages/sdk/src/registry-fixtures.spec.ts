import {
  createAuditLogFixtures,
  createCurrentPageExportProtocolFixture,
  createDictFixtures,
  createExportPlanFixture,
  createFileAssetFixtures,
  createLoginLogFixtures,
  createMenuSummariesFromRegistry,
  createOpenApiDriftFixture,
  createOpenForgeApplyDryRunFixture,
  createOpenForgeDiffFixture,
  createOpenForgeDoctorFixture,
  createOpenForgeManifestListFixture,
  createOpenForgePlanFixture,
  createOpenForgePreflightFixture,
  createOpenForgeStatusFixture,
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
  createIntegrationProviderHealthAuditFixture,
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
    expect(
      createSystemConfigFixtures().items.some(
        (item) =>
          item.key === 'integration.sms.http.api-key.secret' &&
          item.value === '[REDACTED]' &&
          item.visibility === 'secret',
      ),
    ).toBe(true);
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
    expect(createOpenForgeStatusFixture().workspace.noWrite).toBe(true);
    expect(createOpenForgeDoctorFixture().valid).toBe(true);
    expect(createOpenForgePlanFixture().safety.blockPrismaSchemaWrites).toBe(
      true,
    );
    expect(createOpenForgeDiffFixture().entries[0].status).toBe('would-create');
    expect(createOpenForgePreflightFixture().noWrite).toBe(true);
    expect(createOpenForgeApplyDryRunFixture().applied).toBe(false);
    expect(createOpenForgeManifestListFixture().manifests[0].id).toBe(
      'openforge-fixture-manifest',
    );
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
    expect(findIntegrationProviderFixture('sms.http')?.config).toMatchObject({
      secretInjections: expect.arrayContaining([
        expect.objectContaining({
          target: 'header',
          name: 'Authorization',
          secretRef: 'secret://config/integration.sms.http.api-key.secret',
        }),
      ]),
    });
    expect(
      JSON.stringify(findIntegrationProviderFixture('sms.http')),
    ).not.toContain('opencore-local-sms-api-key');
    expect(findIntegrationProviderFixture('sms.sandbox')?.config).toMatchObject(
      {
        token: '[REDACTED]',
      },
    );
    expect(findIntegrationProviderFixture('mail.smtp')?.config).toMatchObject({
      tlsMode: 'starttls-required',
    });
    expect(
      JSON.stringify(findIntegrationProviderFixture('mail.smtp')),
    ).not.toMatch(/"requireTls"|"secure"/);
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
      findIntegrationOutboxFixture('mail', 'outbox_mail_1')?.attachments,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          filename: 'welcome.txt',
          contentType: 'text/plain',
          sizeBytes: 28,
        }),
      ]),
    );
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
      findIntegrationProviderDiagnosticsFixture('sms.http')?.checks,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'provider.secret-injections',
          status: 'pass',
        }),
      ]),
    );
    expect(createIntegrationProviderHealthAuditFixture()).toMatchObject({
      totals: {
        total: 4,
        blocked: 4,
        queued: 1,
        configVaultBacked: 2,
        configVaultMissing: 2,
      },
      providers: expect.arrayContaining([
        expect.objectContaining({
          provider: expect.objectContaining({ code: 'mail.sandbox' }),
          outbox: expect.objectContaining({ queued: 1 }),
        }),
        expect.objectContaining({
          provider: expect.objectContaining({ code: 'sms.sandbox' }),
        }),
      ]),
    });
    expect(
      findOAuthCallbackContractFixture(
        '/api/integrations/oauth/callback/:providerCode',
      )?.stateTtlSeconds,
    ).toBe(300);
    expect(findIntegrationDesignFixture('wechat')?.status).toBe('design-only');
  });
});
