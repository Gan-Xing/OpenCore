import {
  FORBIDDEN_S3_S8_MODULE_PREFIXES,
  collectMenus,
  collectPermissionCodes,
  findModuleByCode,
  listModules,
  validateModuleRegistry,
} from './index';

describe('@opencore/module-registry', () => {
  it('keeps the S3 registry internally valid', () => {
    expect(validateModuleRegistry()).toEqual({
      valid: true,
      issues: [],
    });
  });

  it('covers the S6-S9 core, monitor, and tool module drafts', () => {
    expect(
      listModules().map((moduleDefinition) => moduleDefinition.code),
    ).toEqual(
      expect.arrayContaining([
        'core.user',
        'core.role',
        'core.permission',
        'core.menu',
        'core.dict',
        'core.config',
        'core.notice',
        'core.dept',
        'core.post',
        'core.file',
        'core.audit-log',
        'core.login-log',
        'monitor.status',
        'monitor.version',
        'monitor.queue',
        'tool.openapi',
        'tool.export',
        'tool.openforge',
      ]),
    );
  });

  it('traces every menu permission to a registered permission code', () => {
    const permissionCodes = new Set(collectPermissionCodes());

    for (const menu of collectMenus()) {
      if (!menu.permissionCode) {
        throw new Error(`Menu ${menu.key} is missing a permission code.`);
      }

      expect(permissionCodes.has(menu.permissionCode)).toBe(true);
    }
  });

  it('keeps P4/P5 modules out of the S3-S8 registry', () => {
    const moduleCodes = listModules().map(
      (moduleDefinition) => moduleDefinition.code,
    );

    for (const forbiddenPrefix of FORBIDDEN_S3_S8_MODULE_PREFIXES) {
      expect(moduleCodes.some((code) => code.startsWith(forbiddenPrefix))).toBe(
        false,
      );
    }
  });

  it('allows API and Admin consumers to locate modules by stable code', () => {
    expect(findModuleByCode('tool.openapi')).toMatchObject({
      code: 'tool.openapi',
      layer: 'tool',
      stage: 'S8',
      admin: {
        basePath: '/tools/openapi',
      },
    });

    expect(findModuleByCode('core.notice')).toMatchObject({
      code: 'core.notice',
      admin: {
        basePath: '/system/notices',
      },
    });

    expect(findModuleByCode('core.dept')).toMatchObject({
      code: 'core.dept',
      admin: {
        basePath: '/system/depts',
      },
    });
  });

  it('registers OpenForge as the S9 read-only planning tool', () => {
    expect(findModuleByCode('tool.openforge')).toMatchObject({
      code: 'tool.openforge',
      layer: 'tool',
      priority: 'P0',
      stage: 'S9',
      enabledByDefault: true,
      apiTags: ['Tool OpenForge'],
      admin: {
        basePath: '/tools/openforge',
      },
    });

    expect(collectPermissionCodes()).toEqual(
      expect.arrayContaining(['tool:openforge:read', 'tool:openforge:manage']),
    );

    expect(collectMenus()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'tools.openforge',
          path: '/tools/openforge',
          permissionCode: 'tool:openforge:read',
        }),
      ]),
    );
  });
});
