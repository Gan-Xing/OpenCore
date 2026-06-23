import { Injectable } from '@nestjs/common';
import { getRequestContext } from '@opencore/core';
import { PrismaService } from '@opencore/database';
import type { CreateRoleDto, UpdateRoleDto } from './system-role.dto';
import type { SystemRoleRecord } from './system-role.records';
import {
  normalizeDataScope,
  normalizeCreateSystemRoleInput,
  normalizeUpdateSystemRoleInput,
  systemRoleBadRequest,
  systemRoleConflict,
  systemRoleNotFound,
  SystemRoleRepository,
} from './system-role.repository';

type PrismaRoleWithPermissions = {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  enabled: boolean;
  system: boolean;
  dataScope: string;
  dataScopeDeptIds: unknown;
  permissions: Array<{ permission: { code: string } }>;
};

const ROOT_TENANT_ID = 'tenant_root';

@Injectable()
export class PrismaSystemRoleRepository extends SystemRoleRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async listRoles(): Promise<SystemRoleRecord[]> {
    const tenantId = resolveCurrentTenantId();
    const roles = await this.prisma.role.findMany({
      where: { tenantId },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    return roles.map(toSystemRoleRecord);
  }

  async getRole(code: string): Promise<SystemRoleRecord> {
    return toSystemRoleRecord(await this.findRoleEntityByCode(code));
  }

  async createRole(body: CreateRoleDto): Promise<SystemRoleRecord> {
    const input = normalizeCreateSystemRoleInput(body);
    const tenantId = resolveCurrentTenantId();

    if (
      await this.prisma.role.findUnique({
        where: {
          tenantId_code: {
            tenantId,
            code: input.code,
          },
        },
      })
    ) {
      throw systemRoleConflict(
        'SYSTEM_ROLE_ALREADY_EXISTS',
        'Role already exists.',
        { code: input.code, tenantId },
      );
    }

    await this.assertPermissionsExist(input.permissionCodes);
    await this.assertDeptIdsExist(input.dataScopeDeptIds);
    const role = await this.prisma.role.create({
      data: {
        tenantId,
        code: input.code,
        name: input.name,
        enabled: input.enabled,
        system: input.system,
        dataScope: input.dataScope,
        dataScopeDeptIds: [...input.dataScopeDeptIds],
        permissions: {
          create: input.permissionCodes.map((permissionCode) => ({
            permission: { connect: { code: permissionCode } },
          })),
        },
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return toSystemRoleRecord(role);
  }

  async updateRole(
    code: string,
    body: UpdateRoleDto,
  ): Promise<SystemRoleRecord> {
    const existingEntity = await this.findRoleEntityByCode(code);
    const existing = toSystemRoleRecord(existingEntity);
    const input = normalizeUpdateSystemRoleInput(existing, body);

    if (input.permissionCodes !== undefined) {
      await this.assertPermissionsExist(input.permissionCodes);
    }
    await this.assertDeptIdsExist(input.dataScopeDeptIds);

    const role = await this.prisma.role.update({
      where: {
        tenantId_code: {
          tenantId: existingEntity.tenantId,
          code,
        },
      },
      data: {
        name: input.name,
        enabled: input.enabled,
        system: input.system,
        dataScope: input.dataScope,
        dataScopeDeptIds: [...input.dataScopeDeptIds],
        ...(input.permissionCodes === undefined
          ? {}
          : {
              permissions: {
                deleteMany: {},
                create: input.permissionCodes.map((permissionCode) => ({
                  permission: { connect: { code: permissionCode } },
                })),
              },
            }),
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return toSystemRoleRecord(role);
  }

  async deleteRole(code: string): Promise<{ deleted: true }> {
    const role = await this.findRoleEntityByCode(code);

    if (role.system) {
      throw systemRoleBadRequest(
        'SYSTEM_ROLE_CANNOT_DELETE_SYSTEM',
        'System roles cannot be deleted.',
        { code },
      );
    }

    await this.prisma.rolePermission.deleteMany({
      where: { roleId: role.id },
    });
    await this.prisma.userRole.deleteMany({ where: { roleId: role.id } });
    await this.prisma.role.delete({ where: { id: role.id } });
    return { deleted: true };
  }

  private async findRoleEntityByCode(
    code: string,
  ): Promise<PrismaRoleWithPermissions> {
    const tenantId = resolveCurrentTenantId();
    const role = await this.prisma.role.findUnique({
      where: {
        tenantId_code: {
          tenantId,
          code,
        },
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      throw systemRoleNotFound('SYSTEM_ROLE_NOT_FOUND', 'Role not found.', {
        code,
        tenantId,
      });
    }

    return role;
  }

  private async assertPermissionsExist(
    permissionCodes: readonly string[],
  ): Promise<void> {
    const permissions = await this.prisma.permission.findMany({
      where: { code: { in: [...permissionCodes] } },
      select: { code: true },
    });
    const existing = new Set(permissions.map((permission) => permission.code));
    const missing = permissionCodes.find(
      (permissionCode) => !existing.has(permissionCode),
    );

    if (missing) {
      throw systemRoleNotFound(
        'SYSTEM_ROLE_PERMISSION_NOT_FOUND',
        'Permission not found.',
        { code: missing },
      );
    }
  }

  private async assertDeptIdsExist(deptIds: readonly string[]): Promise<void> {
    if (deptIds.length === 0) {
      return;
    }

    const tenantId = resolveCurrentTenantId();
    const depts = await this.prisma.systemDept.findMany({
      where: { tenantId, id: { in: [...deptIds] } },
      select: { id: true },
    });
    const existing = new Set(depts.map((dept) => dept.id));
    const missing = deptIds.find((deptId) => !existing.has(deptId));

    if (missing) {
      throw systemRoleNotFound(
        'SYSTEM_ROLE_DEPT_NOT_FOUND',
        'System dept not found.',
        { id: missing, tenantId },
      );
    }
  }
}

function toSystemRoleRecord(role: PrismaRoleWithPermissions): SystemRoleRecord {
  return {
    id: role.id,
    code: role.code,
    name: role.name,
    enabled: role.enabled,
    permissionCodes: role.permissions
      .map((rolePermission) => rolePermission.permission.code)
      .sort(),
    system: role.system,
    dataScope: normalizeDataScope(role.dataScope),
    dataScopeDeptIds: normalizeStoredDeptIds(role.dataScopeDeptIds),
  };
}

function resolveCurrentTenantId(): string {
  return getRequestContext()?.tenantId ?? ROOT_TENANT_ID;
}

function normalizeStoredDeptIds(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .sort();
}
