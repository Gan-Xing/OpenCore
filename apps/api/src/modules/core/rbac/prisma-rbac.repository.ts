import {
  collectPermissionDefinitions,
  listModules,
} from '@opencore/module-registry';
import { Injectable } from '@nestjs/common';
import { getRequestContext } from '@opencore/core';
import { PrismaService } from '@opencore/database';
import type {
  SecurityDataScopeProfile,
  SecurityDataScopeType,
  SecurityAuthTenantMembershipLookup,
  SecurityAuthTenantMembershipRecord,
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
const permissionModuleCodeByCode: ReadonlyMap<string, string> = new Map(
  listModules().flatMap((moduleDefinition) =>
    moduleDefinition.permissions.map((permission): [string, string] => [
      permission.code,
      moduleDefinition.code,
    ]),
  ),
);
const ROOT_TENANT_ID = 'tenant_root';

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

type PrismaTenantMembershipWithAuthz = {
  id: string;
  status: string;
  isOwner: boolean;
  deptId?: string | null;
  tenant: {
    id: string;
    code: string;
    slug: string;
    name: string;
    status: string;
    expiresAt?: Date | null;
    plan?: {
      modules: Array<{ moduleCode: string }>;
    } | null;
  };
  roles: Array<{
    role: {
      code: string;
      enabled: boolean;
      dataScope?: string;
      dataScopeDeptIds?: unknown;
      permissions: Array<{
        permission: {
          code: string;
        };
      }>;
    };
  }>;
  posts: Array<{
    post: {
      code: string;
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

  async listTenantMembershipsForUser(
    userId: string,
  ): Promise<readonly SecurityAuthTenantMembershipRecord[]> {
    const memberships = await this.prisma.tenantMembership.findMany({
      where: { userId },
      include: {
        tenant: {
          include: {
            plan: {
              include: {
                modules: true,
              },
            },
          },
        },
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
        posts: {
          include: {
            post: true,
          },
        },
      },
      orderBy: [
        { isOwner: 'desc' },
        { tenant: { code: 'asc' } },
        { id: 'asc' },
      ],
    });

    return memberships.map(toTenantMembershipRecord);
  }

  async findTenantMembershipForUser(
    input: SecurityAuthTenantMembershipLookup,
  ): Promise<SecurityAuthTenantMembershipRecord | undefined> {
    const memberships = await this.listTenantMembershipsForUser(input.userId);
    const hostTenantCode = normalizeTenantHostCode(input.tenantHost);

    return memberships.find(
      (membership) =>
        (!input.membershipId ||
          membership.membershipId === input.membershipId) &&
        (!input.tenantId || membership.tenantId === input.tenantId) &&
        (!input.tenantCode ||
          membership.tenantCode === input.tenantCode ||
          membership.tenantSlug === input.tenantCode) &&
        (!hostTenantCode ||
          membership.tenantCode === hostTenantCode ||
          membership.tenantSlug === hostTenantCode),
    );
  }

  async getDataScopeProfileForUser(
    userId: string,
    membershipId?: string,
  ): Promise<SecurityDataScopeProfile | undefined> {
    if (membershipId) {
      const membership = await this.prisma.tenantMembership.findFirst({
        where: { id: membershipId, userId },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      });

      if (!membership) {
        return undefined;
      }

      return {
        userId,
        deptId: membership.deptId ?? undefined,
        roles: membership.roles
          .filter((membershipRole) => membershipRole.role.enabled)
          .map((membershipRole) => ({
            roleCode: membershipRole.role.code,
            dataScope: normalizeSecurityDataScope(
              membershipRole.role.dataScope,
            ),
            dataScopeDeptIds: normalizeDataScopeDeptIds(
              membershipRole.role.dataScopeDeptIds,
            ),
          }))
          .sort((left, right) => left.roleCode.localeCompare(right.roleCode)),
      };
    }

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
    const tenantId = getRequestContext()?.tenantId ?? ROOT_TENANT_ID;
    const depts = await this.prisma.systemDept.findMany({
      where: { tenantId },
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

function normalizeTenantHostCode(
  value: string | undefined,
): string | undefined {
  if (!value) {
    return undefined;
  }

  const host = value.split(':')[0]?.trim().toLowerCase();

  if (!host || host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/u.test(host)) {
    return undefined;
  }

  return host.split('.')[0];
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

function toTenantMembershipRecord(
  membership: PrismaTenantMembershipWithAuthz,
): SecurityAuthTenantMembershipRecord {
  const enabledModuleCodes = [
    ...new Set(
      membership.tenant.plan?.modules.map((module) => module.moduleCode) ?? [],
    ),
  ].sort();
  const enabledModuleCodeSet = new Set(enabledModuleCodes);
  const activeRoles = membership.roles
    .map((membershipRole) => membershipRole.role)
    .filter((role) => role.enabled);

  return {
    enabledModuleCodes,
    isOwner: membership.isOwner,
    membershipId: membership.id,
    membershipStatus: membership.status,
    permissionCodes: [
      ...new Set(
        activeRoles.flatMap((role) =>
          role.permissions
            .map((rolePermission) => rolePermission.permission.code)
            .filter((permissionCode) =>
              isPermissionEnabledForTenantPlan(
                permissionCode,
                enabledModuleCodeSet,
              ),
            ),
        ),
      ),
    ].sort(),
    postCodes: membership.posts
      .map((membershipPost) => membershipPost.post.code)
      .sort(),
    roleCodes: activeRoles.map((role) => role.code).sort(),
    tenantCode: membership.tenant.code,
    tenantExpiresAt: membership.tenant.expiresAt?.toISOString(),
    tenantId: membership.tenant.id,
    tenantName: membership.tenant.name,
    tenantSlug: membership.tenant.slug,
    tenantStatus: membership.tenant.status,
  };
}

function isPermissionEnabledForTenantPlan(
  permissionCode: string,
  enabledModuleCodes: ReadonlySet<string>,
): boolean {
  const moduleCode = permissionModuleCodeByCode.get(permissionCode);

  return !moduleCode || enabledModuleCodes.has(moduleCode);
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
