import { Injectable } from '@nestjs/common';
import type { SystemMenuRecord } from '../system-menu/system-menu.records';
import { SystemMenuService } from '../system-menu/system-menu.service';
import type { SystemMenuPlanScope } from '../system-menu/system-menu.repository';
import type {
  AssignRoleMenusDto,
  CreateRoleDto,
  RoleMenuAssignmentDto,
  SetRoleStatusDto,
  UpdateRoleDto,
} from './system-role.dto';
import type { SystemRoleRecord } from './system-role.records';
import {
  createSystemRoleExportPreview,
  normalizeSetRoleStatusInput,
  systemRoleBadRequest,
  SystemRoleRepository,
  type SystemRoleExportPreview,
} from './system-role.repository';

@Injectable()
export class SystemRoleService {
  constructor(
    private readonly repository: SystemRoleRepository,
    private readonly menus: SystemMenuService,
  ) {}

  listRoles(): Promise<SystemRoleRecord[]> {
    return this.repository.listRoles();
  }

  getRole(code: string): Promise<SystemRoleRecord> {
    return this.repository.getRole(code);
  }

  createRole(body: CreateRoleDto): Promise<SystemRoleRecord> {
    return this.repository.createRole(body);
  }

  updateRole(code: string, body: UpdateRoleDto): Promise<SystemRoleRecord> {
    return this.repository.updateRole(code, body);
  }

  async setRoleStatus(
    code: string,
    body: SetRoleStatusDto,
  ): Promise<SystemRoleRecord> {
    return this.repository.updateRole(code, normalizeSetRoleStatusInput(body));
  }

  async getRoleMenuAssignment(
    code: string,
    scope: SystemMenuPlanScope = {},
  ): Promise<RoleMenuAssignmentDto> {
    const [role, menus] = await Promise.all([
      this.repository.getRole(code),
      this.menus.listMenus(scope),
    ]);

    return createRoleMenuAssignment(role, menus);
  }

  async assignRoleMenus(
    code: string,
    body: AssignRoleMenusDto,
    scope: SystemMenuPlanScope = {},
  ): Promise<RoleMenuAssignmentDto> {
    const [role, menus] = await Promise.all([
      this.repository.getRole(code),
      this.menus.listMenus(scope),
    ]);
    const menuKeys = normalizeRoleMenuKeys(body?.menuKeys);
    const menusByKey = new Map(menus.map((menu) => [menu.key, menu]));
    const missingKey = menuKeys.find((menuKey) => !menusByKey.has(menuKey));

    if (missingKey) {
      throw systemRoleBadRequest(
        'SYSTEM_ROLE_MENU_NOT_FOUND',
        'System menu not found.',
        { key: missingKey },
      );
    }

    const menuPermissionCodes = collectMenuPermissionCodes(menus);
    const selectedPermissionCodes = menuKeys
      .map((menuKey) => menusByKey.get(menuKey)?.permissionCode)
      .filter((permissionCode): permissionCode is string =>
        Boolean(permissionCode),
      );
    const preservedPermissionCodes = role.permissionCodes.filter(
      (permissionCode) => !menuPermissionCodes.has(permissionCode),
    );
    const nextPermissionCodes = [
      ...new Set([...preservedPermissionCodes, ...selectedPermissionCodes]),
    ].sort();
    const updated = await this.repository.updateRole(code, {
      permissionCodes: nextPermissionCodes,
    });

    return createRoleMenuAssignment(updated, menus);
  }

  deleteRole(code: string): Promise<{ deleted: true }> {
    return this.repository.deleteRole(code);
  }

  async createExportPreview(): Promise<SystemRoleExportPreview> {
    return createSystemRoleExportPreview(await this.repository.listRoles());
  }
}

function createRoleMenuAssignment(
  role: SystemRoleRecord,
  menus: readonly SystemMenuRecord[],
): RoleMenuAssignmentDto {
  const rolePermissionCodes = new Set(role.permissionCodes);
  const menuKeys = menus
    .filter(
      (menu) =>
        menu.permissionCode && rolePermissionCodes.has(menu.permissionCode),
    )
    .map((menu) => menu.key)
    .sort();
  const menuPermissionCodes = collectMenuPermissionCodes(menus);
  const permissionCodes = role.permissionCodes.filter((permissionCode) =>
    menuPermissionCodes.has(permissionCode),
  );
  const preservedPermissionCodes = role.permissionCodes.filter(
    (permissionCode) => !menuPermissionCodes.has(permissionCode),
  );

  return {
    roleCode: role.code,
    menuKeys,
    permissionCodes,
    preservedPermissionCodes,
    menus: [...menus],
  };
}

function collectMenuPermissionCodes(
  menus: readonly SystemMenuRecord[],
): Set<string> {
  return new Set(
    menus
      .map((menu) => menu.permissionCode)
      .filter((permissionCode): permissionCode is string =>
        Boolean(permissionCode),
      ),
  );
}

function normalizeRoleMenuKeys(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    throw systemRoleBadRequest(
      'SYSTEM_ROLE_MENU_KEYS_INVALID',
      'System role menuKeys must be an array.',
      { field: 'menuKeys' },
    );
  }

  const normalized = value.map((menuKey) => normalizeMenuKey(menuKey));
  const duplicate = findFirstDuplicate(normalized);

  if (duplicate) {
    throw systemRoleBadRequest(
      'SYSTEM_ROLE_MENU_KEY_DUPLICATED',
      `System role menu key is duplicated: ${duplicate}`,
      { duplicate },
    );
  }

  return [...normalized].sort();
}

function normalizeMenuKey(value: unknown): string {
  if (typeof value !== 'string') {
    throw systemRoleBadRequest(
      'SYSTEM_ROLE_MENU_KEY_INVALID_TYPE',
      'System role menu key must be a string.',
      { field: 'menuKeys' },
    );
  }

  const normalized = value.trim();

  if (!normalized) {
    throw systemRoleBadRequest(
      'SYSTEM_ROLE_MENU_KEY_REQUIRED',
      'System role menu key is required.',
      { field: 'menuKeys' },
    );
  }

  return normalized;
}

function findFirstDuplicate(values: readonly string[]): string | undefined {
  const seen = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      return value;
    }

    seen.add(value);
  }

  return undefined;
}
