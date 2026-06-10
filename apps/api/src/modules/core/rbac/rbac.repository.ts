import { Injectable } from '@nestjs/common';
import { seedMenus, seedPermissions, seedRoles, seedUsers } from './rbac.seed';

@Injectable()
export class RbacRepository {
  listUsers() {
    return seedUsers.map((user) => ({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      roleCodes: [...user.roleCodes],
      enabled: user.enabled,
    }));
  }

  findUserByUsername(username: string) {
    return seedUsers.find((user) => user.username === username);
  }

  findUserById(id: string) {
    return seedUsers.find((user) => user.id === id);
  }

  listRoles() {
    return seedRoles.map((role) => ({
      id: role.id,
      code: role.code,
      name: role.name,
      permissionCodes: [...role.permissionCodes],
      system: role.system,
    }));
  }

  listPermissions() {
    return seedPermissions;
  }

  listMenus() {
    return seedMenus;
  }

  getPermissionCodesForUser(userId: string): string[] {
    const user = this.findUserById(userId);

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
