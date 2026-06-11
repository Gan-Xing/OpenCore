import {
  collectMenus,
  collectPermissionDefinitions,
} from '@opencore/module-registry';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../platform/database/prisma.service';
import { hashPassword } from './rbac.password';
import {
  createRbacExportPreview,
  RbacRepository,
  type CreateMenuRecord,
  type CreatePermissionRecord,
  type CreateRoleRecord,
  type CreateUserRecord,
  type LoginAttemptRecord,
  type MenuSummaryRecord,
  type PermissionSummaryRecord,
  type RbacExportPreview,
  type RbacExportResource,
  type RbacUserRecord,
  type RoleSummaryRecord,
  type UpdateMenuRecord,
  type UpdatePermissionRecord,
  type UpdateRoleRecord,
  type UpdateUserRecord,
  type UserSummaryRecord,
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
const menuMetadataByKey = new Map<string, { stage: string }>(
  collectMenus().map((menu) => [menu.key, menu]),
);

type PrismaUserWithRoles = {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  enabled: boolean;
  roles: Array<{ role: { code: string } }>;
};

type PrismaRoleWithPermissions = {
  id: string;
  code: string;
  name: string;
  system: boolean;
  permissions: Array<{ permission: { code: string } }>;
};

type PrismaPermission = {
  code: string;
  title: string;
};

type PrismaMenuWithPermission = {
  key: string;
  title: string;
  path: string;
  order: number;
  permission: { code: string } | null;
};

@Injectable()
export class PrismaRbacRepository extends RbacRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async listUsers(): Promise<UserSummaryRecord[]> {
    const users = await this.prisma.user.findMany({
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
      orderBy: { username: 'asc' },
    });

    return users.map(toUserSummaryRecord);
  }

  async createUser(body: CreateUserRecord): Promise<UserSummaryRecord> {
    if (
      await this.prisma.user.findUnique({ where: { username: body.username } })
    ) {
      throw new ConflictException(`User already exists: ${body.username}`);
    }

    await this.assertRolesExist(body.roleCodes);
    const user = await this.prisma.user.create({
      data: {
        username: body.username,
        displayName: body.displayName,
        passwordHash: hashPassword(body.password),
        enabled: body.enabled ?? true,
        roles: {
          create: body.roleCodes.map((roleCode) => ({
            role: { connect: { code: roleCode } },
          })),
        },
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    return toUserSummaryRecord(user);
  }

  async updateUser(
    id: string,
    body: UpdateUserRecord,
  ): Promise<UserSummaryRecord> {
    await this.findUserEntityById(id);

    if (body.roleCodes) {
      await this.assertRolesExist(body.roleCodes);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        displayName: body.displayName,
        passwordHash: body.password ? hashPassword(body.password) : undefined,
        enabled: body.enabled,
        ...(body.roleCodes
          ? {
              roles: {
                deleteMany: {},
                create: body.roleCodes.map((roleCode) => ({
                  role: { connect: { code: roleCode } },
                })),
              },
            }
          : {}),
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    return toUserSummaryRecord(user);
  }

  async deleteUser(id: string): Promise<{ deleted: true }> {
    await this.findUserEntityById(id);
    await this.prisma.userRole.deleteMany({ where: { userId: id } });
    await this.prisma.user.delete({ where: { id } });
    return { deleted: true };
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

  async listRoles(): Promise<RoleSummaryRecord[]> {
    const roles = await this.prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    return roles.map(toRoleSummaryRecord);
  }

  async createRole(body: CreateRoleRecord): Promise<RoleSummaryRecord> {
    if (await this.prisma.role.findUnique({ where: { code: body.code } })) {
      throw new ConflictException(`Role already exists: ${body.code}`);
    }

    await this.assertPermissionsExist(body.permissionCodes);
    const role = await this.prisma.role.create({
      data: {
        code: body.code,
        name: body.name,
        system: body.system ?? false,
        permissions: {
          create: body.permissionCodes.map((permissionCode) => ({
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

    return toRoleSummaryRecord(role);
  }

  async updateRole(
    code: string,
    body: UpdateRoleRecord,
  ): Promise<RoleSummaryRecord> {
    const existing = await this.findRoleEntityByCode(code);

    if (body.permissionCodes) {
      await this.assertPermissionsExist(body.permissionCodes);
    }

    const role = await this.prisma.role.update({
      where: { code },
      data: {
        name: body.name,
        system: existing.system ? existing.system : body.system,
        ...(body.permissionCodes
          ? {
              permissions: {
                deleteMany: {},
                create: body.permissionCodes.map((permissionCode) => ({
                  permission: { connect: { code: permissionCode } },
                })),
              },
            }
          : {}),
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return toRoleSummaryRecord(role);
  }

  async deleteRole(code: string): Promise<{ deleted: true }> {
    const role = await this.findRoleEntityByCode(code);

    if (role.system) {
      throw new BadRequestException('System roles cannot be deleted.');
    }

    await this.prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await this.prisma.userRole.deleteMany({ where: { roleId: role.id } });
    await this.prisma.role.delete({ where: { code } });
    return { deleted: true };
  }

  async listPermissions(): Promise<PermissionSummaryRecord[]> {
    const permissions = await this.prisma.permission.findMany({
      orderBy: { code: 'asc' },
    });

    return permissions.map(toPermissionSummaryRecord);
  }

  async createPermission(
    body: CreatePermissionRecord,
  ): Promise<PermissionSummaryRecord> {
    if (
      await this.prisma.permission.findUnique({ where: { code: body.code } })
    ) {
      throw new ConflictException(`Permission already exists: ${body.code}`);
    }

    const permission = await this.prisma.permission.create({
      data: {
        code: body.code,
        title: body.title,
      },
    });

    return toPermissionSummaryRecord(permission);
  }

  async updatePermission(
    code: string,
    body: UpdatePermissionRecord,
  ): Promise<PermissionSummaryRecord> {
    await this.findPermissionEntityByCode(code);
    const permission = await this.prisma.permission.update({
      where: { code },
      data: {
        title: body.title,
      },
    });

    return toPermissionSummaryRecord(permission);
  }

  async deletePermission(code: string): Promise<{ deleted: true }> {
    const permission = await this.findPermissionEntityByCode(code);
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

  async listMenus(): Promise<MenuSummaryRecord[]> {
    const menus = await this.prisma.menu.findMany({
      include: {
        permission: true,
      },
      orderBy: [{ order: 'asc' }, { key: 'asc' }],
    });

    return menus.map(toMenuSummaryRecord);
  }

  async createMenu(body: CreateMenuRecord): Promise<MenuSummaryRecord> {
    if (await this.prisma.menu.findUnique({ where: { key: body.key } })) {
      throw new ConflictException(`Menu already exists: ${body.key}`);
    }

    const permission = body.permissionCode
      ? await this.findPermissionEntityByCode(body.permissionCode)
      : undefined;
    const menu = await this.prisma.menu.create({
      data: {
        key: body.key,
        title: body.title,
        path: body.path,
        order: body.order,
        permissionId: permission?.id,
      },
      include: {
        permission: true,
      },
    });

    return toMenuSummaryRecord(menu);
  }

  async updateMenu(
    key: string,
    body: UpdateMenuRecord,
  ): Promise<MenuSummaryRecord> {
    await this.findMenuEntityByKey(key);
    const permissionId =
      body.permissionCode === undefined
        ? undefined
        : (await this.findPermissionEntityByCode(body.permissionCode)).id;
    const menu = await this.prisma.menu.update({
      where: { key },
      data: {
        title: body.title,
        path: body.path,
        order: body.order,
        ...(body.permissionCode === undefined ? {} : { permissionId }),
      },
      include: {
        permission: true,
      },
    });

    return toMenuSummaryRecord(menu);
  }

  async deleteMenu(key: string): Promise<{ deleted: true }> {
    await this.findMenuEntityByKey(key);
    await this.prisma.menu.delete({ where: { key } });
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
          userRole.role.permissions.map(
            (rolePermission) => rolePermission.permission.code,
          ),
        ),
      ),
    ].sort();
  }

  async createExportPreview(
    resource: RbacExportResource,
  ): Promise<RbacExportPreview> {
    const rowsByResource = {
      menus: await this.listMenus(),
      permissions: await this.listPermissions(),
      roles: await this.listRoles(),
      users: await this.listUsers(),
    } satisfies Record<RbacExportResource, readonly unknown[]>;

    return createRbacExportPreview(resource, rowsByResource[resource]);
  }

  async recordLoginAttempt(record: LoginAttemptRecord): Promise<void> {
    await this.prisma.loginLog.create({
      data: {
        username: record.username,
        success: record.success,
        failureReason: record.failureReason,
        ip: record.ip,
        userAgent: record.userAgent,
        requestId: record.requestId,
      },
    });
  }

  private async findUserEntityById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User not found: ${id}`);
    }

    return user;
  }

  private async findRoleEntityByCode(code: string) {
    const role = await this.prisma.role.findUnique({ where: { code } });

    if (!role) {
      throw new NotFoundException(`Role not found: ${code}`);
    }

    return role;
  }

  private async findPermissionEntityByCode(code: string) {
    const permission = await this.prisma.permission.findUnique({
      where: { code },
    });

    if (!permission) {
      throw new NotFoundException(`Permission not found: ${code}`);
    }

    return permission;
  }

  private async findMenuEntityByKey(key: string) {
    const menu = await this.prisma.menu.findUnique({ where: { key } });

    if (!menu) {
      throw new NotFoundException(`Menu not found: ${key}`);
    }

    return menu;
  }

  private async assertRolesExist(roleCodes: readonly string[]): Promise<void> {
    const roles = await this.prisma.role.findMany({
      where: { code: { in: [...roleCodes] } },
      select: { code: true },
    });
    const existing = new Set(roles.map((role) => role.code));
    const missing = roleCodes.find((roleCode) => !existing.has(roleCode));

    if (missing) {
      throw new NotFoundException(`Role not found: ${missing}`);
    }
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
      throw new NotFoundException(`Permission not found: ${missing}`);
    }
  }
}

function toUserSummaryRecord(user: PrismaUserWithRoles): UserSummaryRecord {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    roleCodes: user.roles.map((userRole) => userRole.role.code).sort(),
    enabled: user.enabled,
  };
}

function toUserRecord(user: PrismaUserWithRoles): RbacUserRecord {
  return {
    ...toUserSummaryRecord(user),
    passwordHash: user.passwordHash,
  };
}

function toRoleSummaryRecord(
  role: PrismaRoleWithPermissions,
): RoleSummaryRecord {
  return {
    id: role.id,
    code: role.code,
    name: role.name,
    permissionCodes: role.permissions
      .map((rolePermission) => rolePermission.permission.code)
      .sort(),
    system: role.system,
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
  };
}

function toMenuSummaryRecord(
  menu: PrismaMenuWithPermission,
): MenuSummaryRecord {
  const metadata = menuMetadataByKey.get(menu.key);

  return {
    key: menu.key,
    title: menu.title,
    path: menu.path,
    permissionCode: menu.permission?.code,
    stage: metadata?.stage ?? 'S6',
    order: menu.order,
  };
}
