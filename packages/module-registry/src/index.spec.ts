import {
  FORBIDDEN_S3_S8_MODULE_PREFIXES,
  collectMenuTree,
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

  it('derives a tree-shaped menu control plane from registry menus', () => {
    expect(collectMenuTree()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'system',
          type: 'directory',
          icon: 'SettingOutlined',
          path: '/system',
        }),
        expect.objectContaining({
          key: 'system.menus',
          parentKey: 'system',
          type: 'menu',
          component: 'System/Menus',
          status: 'enabled',
          cache: false,
          hidden: false,
        }),
      ]),
    );
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

    expect(findModuleByCode('core.post')).toMatchObject({
      code: 'core.post',
      admin: {
        basePath: '/system/posts',
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

  it('registers user import as an explicit permission action', () => {
    expect(collectPermissionCodes()).toEqual(
      expect.arrayContaining(['core:user:import', 'core:user:manage']),
    );

    expect(findModuleByCode('core.user')?.permissions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'core:user:import',
          title: 'Import users',
          stage: 'S6',
        }),
        expect.objectContaining({
          code: 'core:user:manage',
          title: 'Assign roles to users',
          stage: 'S6',
          dangerous: true,
        }),
      ]),
    );
  });

  it('registers login-log management for account unlock actions', () => {
    expect(collectPermissionCodes()).toEqual(
      expect.arrayContaining([
        'core:login-log:delete',
        'core:login-log:manage',
      ]),
    );

    expect(findModuleByCode('core.login-log')?.permissions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'core:login-log:delete',
          title: 'Delete login logs',
          stage: 'S7',
          dangerous: true,
        }),
        expect.objectContaining({
          code: 'core:login-log:manage',
          title: 'Manage login logs',
          stage: 'S7',
          dangerous: true,
        }),
      ]),
    );
  });

  it('registers audit-log cleanup as a dangerous permission action', () => {
    expect(collectPermissionCodes()).toEqual(
      expect.arrayContaining(['core:audit-log:delete']),
    );

    expect(findModuleByCode('core.audit-log')?.permissions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'core:audit-log:delete',
          title: 'Delete operation logs',
          stage: 'S7',
          dangerous: true,
        }),
      ]),
    );
  });
});
