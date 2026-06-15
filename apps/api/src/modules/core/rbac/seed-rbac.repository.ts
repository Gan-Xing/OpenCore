import { Injectable } from '@nestjs/common';
import {
  seedSystemDepts,
  seedSystemRoles,
  seedSystemUsers,
  type SystemRoleRecord,
  type SystemUserRecord,
} from '@opencore/system/records';
import type { SecurityDataScopeProfile } from '@opencore/security';
import { seedPermissions } from './rbac.seed';
import {
  createRbacExportPreview,
  normalizeCreatePermissionInput,
  normalizeUpdatePermissionInput,
  rbacBadRequest,
  rbacConflict,
  rbacNotFound,
  RbacRepository,
  type CreatePermissionRecord,
  type PermissionSummaryRecord,
  type RbacExportPreview,
  type RbacExportResource,
  type RbacUserRecord,
  type UpdatePermissionRecord,
} from './rbac.repository';

@Injectable()
export class SeedRbacRepository extends RbacRepository {
  private readonly users: SystemUserRecord[];
  private readonly roles: SystemRoleRecord[] = seedSystemRoles.map((role) => ({
    ...role,
    permissionCodes: [...role.permissionCodes],
    dataScopeDeptIds: [...role.dataScopeDeptIds],
  }));
  private readonly permissions: PermissionSummaryRecord[] = seedPermissions.map(
    (permission) => ({
      ...permission,
    }),
  );
  constructor(users: readonly SystemUserRecord[] = seedSystemUsers) {
    super();
    this.users = users.map(cloneUserRecord);
  }

  async findUserByUsername(
    username: string,
  ): Promise<RbacUserRecord | undefined> {
    const user = this.users.find(
      (candidate) => candidate.username === username,
    );
    return user ? toRbacUserRecord(user) : undefined;
  }

  async findUserById(id: string): Promise<RbacUserRecord | undefined> {
    const user = this.users.find((candidate) => candidate.id === id);
    return user ? toRbacUserRecord(user) : undefined;
  }

  async listPermissions(): Promise<PermissionSummaryRecord[]> {
    return this.permissions.map((permission) => ({ ...permission }));
  }

  async getPermission(code: string): Promise<PermissionSummaryRecord> {
    return { ...this.findMutablePermissionByCode(code) };
  }

  async createPermission(
    body: CreatePermissionRecord,
  ): Promise<PermissionSummaryRecord> {
    const input = normalizeCreatePermissionInput(body);

    if (this.permissions.some((permission) => permission.code === input.code)) {
      throw rbacConflict(
        'RBAC_PERMISSION_ALREADY_EXISTS',
        'Permission already exists.',
        { code: input.code },
      );
    }

    const permission = {
      code: input.code,
      title: input.title,
      stage: 'S6',
      dangerous: false,
      system: false,
    };
    this.permissions.push(permission);
    return { ...permission };
  }

  async updatePermission(
    code: string,
    body: UpdatePermissionRecord,
  ): Promise<PermissionSummaryRecord> {
    const input = normalizeUpdatePermissionInput(body);
    const permission = this.findMutablePermissionByCode(code);

    if (permission.system) {
      throw rbacBadRequest(
        'RBAC_SYSTEM_PERMISSION_IMMUTABLE',
        'System permissions cannot be updated.',
        { action: 'updated', code },
      );
    }

    permission.title = input.title ?? permission.title;
    return { ...permission };
  }

  async deletePermission(code: string): Promise<{ deleted: true }> {
    const index = this.permissions.findIndex(
      (permission) => permission.code === code,
    );

    if (index === -1) {
      throw rbacNotFound('RBAC_PERMISSION_NOT_FOUND', 'Permission not found.', {
        code,
      });
    }

    if (this.permissions[index]?.system) {
      throw rbacBadRequest(
        'RBAC_SYSTEM_PERMISSION_IMMUTABLE',
        'System permissions cannot be deleted.',
        { action: 'deleted', code },
      );
    }

    this.permissions.splice(index, 1);
    for (const role of this.roles) {
      role.permissionCodes = role.permissionCodes.filter(
        (permissionCode) => permissionCode !== code,
      );
    }
    return { deleted: true };
  }

  async getPermissionCodesForUser(userId: string): Promise<string[]> {
    const user = this.users.find((candidate) => candidate.id === userId);

    if (!user || !user.enabled) {
      return [];
    }

    return [
      ...new Set(
        this.roles
          .filter((role) => role.enabled && user.roleCodes.includes(role.code))
          .flatMap((role) => role.permissionCodes),
      ),
    ].sort();
  }

  async getDataScopeProfileForUser(
    userId: string,
  ): Promise<SecurityDataScopeProfile | undefined> {
    const user = this.users.find((candidate) => candidate.id === userId);

    if (!user || !user.enabled) {
      return undefined;
    }

    return {
      userId: user.id,
      deptId: user.deptId,
      roles: this.roles
        .filter((role) => role.enabled && user.roleCodes.includes(role.code))
        .map((role) => ({
          roleCode: role.code,
          dataScope: role.dataScope,
          dataScopeDeptIds: [...role.dataScopeDeptIds],
        }))
        .sort((left, right) => left.roleCode.localeCompare(right.roleCode)),
    };
  }

  async listDescendantDeptIds(deptId: string): Promise<string[]> {
    const childrenByParentId = new Map<string, string[]>();

    for (const dept of seedSystemDepts) {
      if (!dept.parentId) {
        continue;
      }

      childrenByParentId.set(dept.parentId, [
        ...(childrenByParentId.get(dept.parentId) ?? []),
        dept.id,
      ]);
    }

    return collectDescendantDeptIds(deptId, childrenByParentId);
  }

  async createExportPreview(
    resource: RbacExportResource,
  ): Promise<RbacExportPreview> {
    const rowsByResource = {
      permissions: await this.listPermissions(),
    } satisfies Record<RbacExportResource, readonly unknown[]>;

    return createRbacExportPreview(resource, rowsByResource[resource]);
  }

  private findMutablePermissionByCode(code: string): PermissionSummaryRecord {
    const permission = this.permissions.find(
      (candidate) => candidate.code === code,
    );

    if (!permission) {
      throw rbacNotFound('RBAC_PERMISSION_NOT_FOUND', 'Permission not found.', {
        code,
      });
    }

    return permission;
  }
}

function cloneUserRecord(user: SystemUserRecord): SystemUserRecord {
  return {
    ...user,
    roleCodes: user.roleCodes
      .filter((roleCode) =>
        seedSystemRoles.some((role) => role.enabled && role.code === roleCode),
      )
      .sort(),
    postCodes: [...user.postCodes],
  };
}

function toRbacUserRecord(user: SystemUserRecord): RbacUserRecord {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    passwordHash: user.passwordHash,
    roleCodes: user.roleCodes
      .filter((roleCode) =>
        seedSystemRoles.some((role) => role.enabled && role.code === roleCode),
      )
      .sort(),
    enabled: user.enabled,
    avatarUrl: user.avatarUrl,
  };
}

function collectDescendantDeptIds(
  rootDeptId: string,
  childrenByParentId: ReadonlyMap<string, readonly string[]>,
): string[] {
  const descendants: string[] = [];
  const queue = [...(childrenByParentId.get(rootDeptId) ?? [])].sort();

  while (queue.length > 0) {
    const deptId = queue.shift();

    if (!deptId) {
      continue;
    }

    descendants.push(deptId);
    queue.push(...[...(childrenByParentId.get(deptId) ?? [])].sort());
  }

  return descendants;
}
