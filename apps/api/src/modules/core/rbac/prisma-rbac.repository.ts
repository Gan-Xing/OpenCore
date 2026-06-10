import {
  collectMenus,
  collectPermissionDefinitions,
} from '@opencore/module-registry';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/prisma.service';
import {
  RbacRepository,
  type MenuSummaryRecord,
  type PermissionSummaryRecord,
  type RbacUserRecord,
  type RoleSummaryRecord,
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

    return users.map((user) => ({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      roleCodes: user.roles.map((userRole) => userRole.role.code).sort(),
      enabled: user.enabled,
    }));
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

    return roles.map((role) => ({
      id: role.id,
      code: role.code,
      name: role.name,
      permissionCodes: role.permissions
        .map((rolePermission) => rolePermission.permission.code)
        .sort(),
      system: role.system,
    }));
  }

  async listPermissions(): Promise<PermissionSummaryRecord[]> {
    const permissions = await this.prisma.permission.findMany({
      orderBy: { code: 'asc' },
    });

    return permissions.map((permission) => {
      const metadata = permissionMetadataByCode.get(permission.code);

      return {
        code: permission.code,
        title: permission.title,
        stage: metadata?.stage ?? 'S6',
        dangerous: metadata?.dangerous ?? false,
      };
    });
  }

  async listMenus(): Promise<MenuSummaryRecord[]> {
    const menus = await this.prisma.menu.findMany({
      include: {
        permission: true,
      },
      orderBy: [{ order: 'asc' }, { key: 'asc' }],
    });

    return menus.map((menu) => {
      const metadata = menuMetadataByKey.get(menu.key);

      return {
        key: menu.key,
        title: menu.title,
        path: menu.path,
        permissionCode: menu.permission?.code,
        stage: metadata?.stage ?? 'S6',
        order: menu.order,
      };
    });
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
}

function toUserRecord(user: PrismaUserWithRoles): RbacUserRecord {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    passwordHash: user.passwordHash,
    roleCodes: user.roles.map((userRole) => userRole.role.code).sort(),
    enabled: user.enabled,
  };
}
