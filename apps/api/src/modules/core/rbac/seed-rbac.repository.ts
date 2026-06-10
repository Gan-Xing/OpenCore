import { Injectable } from '@nestjs/common';
import { seedMenus, seedPermissions, seedRoles, seedUsers } from './rbac.seed';
import {
  RbacRepository,
  type MenuSummaryRecord,
  type PermissionSummaryRecord,
  type RbacUserRecord,
  type RoleSummaryRecord,
  type UserSummaryRecord,
} from './rbac.repository';

@Injectable()
export class SeedRbacRepository extends RbacRepository {
  async listUsers(): Promise<UserSummaryRecord[]> {
    return seedUsers.map((user) => ({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      roleCodes: [...user.roleCodes],
      enabled: user.enabled,
    }));
  }

  async findUserByUsername(
    username: string,
  ): Promise<RbacUserRecord | undefined> {
    return seedUsers.find((user) => user.username === username);
  }

  async findUserById(id: string): Promise<RbacUserRecord | undefined> {
    return seedUsers.find((user) => user.id === id);
  }

  async listRoles(): Promise<RoleSummaryRecord[]> {
    return seedRoles.map((role) => ({
      id: role.id,
      code: role.code,
      name: role.name,
      permissionCodes: [...role.permissionCodes],
      system: role.system,
    }));
  }

  async listPermissions(): Promise<PermissionSummaryRecord[]> {
    return seedPermissions;
  }

  async listMenus(): Promise<MenuSummaryRecord[]> {
    return seedMenus;
  }

  async getPermissionCodesForUser(userId: string): Promise<string[]> {
    const user = await this.findUserById(userId);

    if (!user || !user.enabled) {
      return [];
    }

    return [
      ...new Set(
        seedRoles
          .filter((role) => user.roleCodes.includes(role.code))
          .flatMap((role) => role.permissionCodes),
      ),
    ].sort();
  }
}
