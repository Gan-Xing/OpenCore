import { collectPermissionDefinitions } from '@opencore/module-registry';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@opencore/database';
import type {
  SecurityDataScopeProfile,
  SecurityDataScopeType,
} from '@opencore/security';
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

const permissionMetadataByCode = new Map<
  string,
  { stage: string; dangerous?: boolean }
>(
  collectPermissionDefinitions().map((permission) => [
    permission.code,
    permission,
  ]),
);

type PrismaUserWithRoles = {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  deptId?: string | null;
  enabled: boolean;
  avatarUrl?: string | null;
  roles: Array<{
    role: {
      code: string;
      enabled: boolean;
      dataScope?: string;
      dataScopeDeptIds?: unknown;
    };
  }>;
};

type PrismaPermission = {
  code: string;
  title: string;
};

@Injectable()
export class PrismaRbacRepository extends RbacRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findUserByUsername(
    username: string,
  ): Promise<RbacUserRecord | undefined> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    return user ? toUserRecord(user) : undefined;
  }

  async findUserById(id: string): Promise<RbacUserRecord | undefined> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    return user ? toUserRecord(user) : undefined;
  }

  async listPermissions(): Promise<PermissionSummaryRecord[]> {
    const permissions = await this.prisma.permission.findMany({
      orderBy: { code: 'asc' },
    });

    return permissions.map(toPermissionSummaryRecord);
  }

  async getPermission(code: string): Promise<PermissionSummaryRecord> {
    return toPermissionSummaryRecord(
      await this.findPermissionEntityByCode(code),
    );
  }

  async createPermission(
    body: CreatePermissionRecord,
  ): Promise<PermissionSummaryRecord> {
    const input = normalizeCreatePermissionInput(body);

    if (
      await this.prisma.permission.findUnique({ where: { code: input.code } })
    ) {
      throw rbacConflict(
        'RBAC_PERMISSION_ALREADY_EXISTS',
        'Permission already exists.',
        { code: input.code },
      );
    }

    const permission = await this.prisma.permission.create({
      data: {
        code: input.code,
        title: input.title,
      },
    });

    return toPermissionSummaryRecord(permission);
  }

  async updatePermission(
    code: string,
    body: UpdatePermissionRecord,
  ): Promise<PermissionSummaryRecord> {
    const input = normalizeUpdatePermissionInput(body);
    await this.findPermissionEntityByCode(code);
    this.assertCustomPermission(code, 'updated');
    const permission = await this.prisma.permission.update({
      where: { code },
      data: {
        title: input.title,
      },
    });

    return toPermissionSummaryRecord(permission);
  }

  async deletePermission(code: string): Promise<{ deleted: true }> {
    const permission = await this.findPermissionEntityByCode(code);
    this.assertCustomPermission(code, 'deleted');
    await this.prisma.menu.updateMany({
      where: { permissionId: permission.id },
      data: { permissionId: null },
    });
    await this.prisma.rolePermission.deleteMany({
      where: { permissionId: permission.id },
    });
    await this.prisma.permission.delete({ where: { code } });
    return { deleted: true };
  }

  async getPermissionCodesForUser(userId: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || !user.enabled) {
      return [];
    }

    return [
      ...new Set(
        user.roles.flatMap((userRole) =>
          userRole.role.enabled
            ? userRole.role.permissions.map(
                (rolePermission) => rolePermission.permission.code,
              )
            : [],
        ),
      ),
    ].sort();
  }

  async getDataScopeProfileForUser(
    userId: string,
  ): Promise<SecurityDataScopeProfile | undefined> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user || !user.enabled) {
      return undefined;
    }

    return {
      userId: user.id,
      deptId: user.deptId ?? undefined,
      roles: user.roles
        .filter((userRole) => userRole.role.enabled)
        .map((userRole) => ({
          roleCode: userRole.role.code,
          dataScope: normalizeSecurityDataScope(userRole.role.dataScope),
          dataScopeDeptIds: normalizeDataScopeDeptIds(
            userRole.role.dataScopeDeptIds,
          ),
        }))
        .sort((left, right) => left.roleCode.localeCompare(right.roleCode)),
    };
  }

  async listDescendantDeptIds(deptId: string): Promise<string[]> {
    const depts = await this.prisma.systemDept.findMany({
      select: { id: true, parentId: true },
    });
    const childrenByParentId = new Map<string, string[]>();

    for (const dept of depts) {
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

  private async findPermissionEntityByCode(code: string) {
    const permission = await this.prisma.permission.findUnique({
      where: { code },
    });

    if (!permission) {
      throw rbacNotFound('RBAC_PERMISSION_NOT_FOUND', 'Permission not found.', {
        code,
      });
    }

    return permission;
  }

  private assertCustomPermission(code: string, action: 'deleted' | 'updated') {
    if (permissionMetadataByCode.has(code)) {
      throw rbacBadRequest(
        'RBAC_SYSTEM_PERMISSION_IMMUTABLE',
        `System permissions cannot be ${action}.`,
        { action, code },
      );
    }
  }
}

const securityDataScopeTypes = new Set<SecurityDataScopeType>([
  'all',
  'custom',
  'dept_tree',
  'own_dept',
  'self',
]);

function toUserRecord(user: PrismaUserWithRoles): RbacUserRecord {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    passwordHash: user.passwordHash,
    roleCodes: user.roles
      .filter((userRole) => userRole.role.enabled)
      .map((userRole) => userRole.role.code)
      .sort(),
    enabled: user.enabled,
    avatarUrl: user.avatarUrl ?? undefined,
  };
}

function toPermissionSummaryRecord(
  permission: PrismaPermission,
): PermissionSummaryRecord {
  const metadata = permissionMetadataByCode.get(permission.code);

  return {
    code: permission.code,
    title: permission.title,
    stage: metadata?.stage ?? 'S6',
    dangerous: metadata?.dangerous ?? false,
    system: Boolean(metadata),
  };
}

function normalizeSecurityDataScope(value: string): SecurityDataScopeType {
  if (securityDataScopeTypes.has(value as SecurityDataScopeType)) {
    return value as SecurityDataScopeType;
  }

  throw new Error(`Unsupported role data scope: ${value}`);
}

function normalizeDataScopeDeptIds(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .sort();
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
