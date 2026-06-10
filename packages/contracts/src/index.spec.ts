import {
  OPENAPI_CONTRACT_PROTOCOL,
  CURRENT_PAGE_EXPORT_PROTOCOL,
  createCurrentPageExportPlan,
  OPENFORGE_CONTRACT_PROTOCOL,
  OPENFORGE_TEMPLATE_VERSION,
  parsePermissionCode,
  validateMenuDefinition,
  validateModuleDefinition,
  validatePermissionDefinition,
  type ModuleDefinition,
} from './index';

describe('@opencore/contracts', () => {
  it('parses permission codes with stable layer/resource/action parts', () => {
    expect(parsePermissionCode('core:user:read')).toEqual({
      layer: 'core',
      resource: 'user',
      action: 'read',
    });
    expect(parsePermissionCode('core:user:approve')).toBeNull();
    expect(parsePermissionCode('crm:customer:read')).toBeNull();
  });

  it('validates permission and menu schema fields', () => {
    expect(
      validatePermissionDefinition({
        code: 'core:user:read',
        title: 'Read users',
        stage: 'S6',
      }).valid,
    ).toBe(true);

    expect(
      validateMenuDefinition({
        key: 'system.users',
        title: 'Users',
        path: '/system/users',
        permissionCode: 'core:user:read',
        order: 100,
        stage: 'S6',
      }).valid,
    ).toBe(true);
  });

  it('rejects module definitions whose permission codes drift from the module', () => {
    const moduleDefinition: ModuleDefinition = {
      code: 'core.user',
      title: 'Users',
      layer: 'core',
      priority: 'P1',
      status: 'planned',
      stage: 'S6',
      enabledByDefault: true,
      description: 'User management contract.',
      apiTags: ['Core Users'],
      permissions: [
        {
          code: 'core:role:read',
          title: 'Read roles',
          stage: 'S6',
        },
      ],
      menus: [],
    };

    expect(validateModuleDefinition(moduleDefinition)).toEqual({
      valid: false,
      issues: [
        {
          path: 'core.user.permissions.core:role:read.code',
          message: 'Permission code resource must be user.',
        },
      ],
    });
  });

  it('keeps S3 OpenAPI export and SDK generation as an explicit protocol', () => {
    expect(OPENAPI_CONTRACT_PROTOCOL).toMatchObject({
      stage: 'S3',
      status: 'protocol-only',
      sourceApplication: 'apps/api',
      ownerPackage: '@opencore/contracts',
    });
    expect(OPENAPI_CONTRACT_PROTOCOL.documentPath).toContain(
      'packages/contracts',
    );
    expect(OPENAPI_CONTRACT_PROTOCOL.sdkPackage).toBe('@opencore/sdk');
  });

  it('keeps S8 current-page export as a bounded synchronous protocol', () => {
    expect(CURRENT_PAGE_EXPORT_PROTOCOL).toMatchObject({
      stage: 'S8',
      scope: 'current-page',
      asyncExport: false,
    });
    expect(
      createCurrentPageExportPlan({
        resource: 'dicts',
        columns: ['code', 'name'],
        rowCount: 1200,
        generatedAt: '2026-06-10T00:00:00.000Z',
      }),
    ).toMatchObject({
      filename: 'opencore-dicts.csv',
      format: 'csv',
      rowCount: 1000,
    });
  });

  it('keeps S9 OpenForge as a read-only planning protocol', () => {
    expect(OPENFORGE_CONTRACT_PROTOCOL).toMatchObject({
      stage: 'S9',
      status: 'read-only-plan',
      toolPackage: '@opencore/openforge',
      noWrite: true,
    });
    expect(OPENFORGE_TEMPLATE_VERSION).toBe('s9-openforge-mvp-v1');
    expect(OPENFORGE_CONTRACT_PROTOCOL.planCommand).toContain('openforge:plan');
    expect(OPENFORGE_CONTRACT_PROTOCOL.diffCommand).toContain('openforge:diff');
    expect(OPENFORGE_CONTRACT_PROTOCOL.checkCommand).toBe(
      'pnpm openforge:check',
    );
    expect(OPENFORGE_CONTRACT_PROTOCOL.exampleSchemaPath).toBe(
      'tools/generator/examples/core.dict.schema.json',
    );
  });
});
