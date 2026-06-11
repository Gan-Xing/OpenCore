import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hashPassword } from './rbac.password';
import { seedMenus, seedPermissions, seedRoles, seedUsers } from './rbac.seed';
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

@Injectable()
export class SeedRbacRepository extends RbacRepository {
  private readonly users: RbacUserRecord[] = seedUsers.map((user) => ({
    ...user,
    roleCodes: [...user.roleCodes],
  }));
  private readonly roles: RoleSummaryRecord[] = seedRoles.map((role) => ({
    ...role,
    permissionCodes: [...role.permissionCodes],
  }));
  private readonly permissions: PermissionSummaryRecord[] = seedPermissions.map(
    (permission) => ({
      ...permission,
    }),
  );
  private readonly menus: MenuSummaryRecord[] = seedMenus.map((menu) => ({
    ...menu,
  }));
  private readonly loginAttempts: LoginAttemptRecord[] = [];

  async listUsers(): Promise<UserSummaryRecord[]> {
    return this.users.map((user) => ({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      roleCodes: [...user.roleCodes],
      enabled: user.enabled,
    }));
  }

  async createUser(body: CreateUserRecord): Promise<UserSummaryRecord> {
    if (this.users.some((user) => user.username === body.username)) {
      throw new ConflictException(`User already exists: ${body.username}`);
    }

    this.assertRoleCodes(body.roleCodes);
    const user = {
      id: `user_${body.username}`,
      username: body.username,
      displayName: body.displayName,
      passwordHash: hashPassword(body.password),
      roleCodes: [...body.roleCodes],
      enabled: body.enabled ?? true,
    };
    this.users.push(user);
    return this.toUserSummary(user);
  }

  async updateUser(
    id: string,
    body: UpdateUserRecord,
  ): Promise<UserSummaryRecord> {
    const user = this.findMutableUserById(id);

    if (body.roleCodes) {
      this.assertRoleCodes(body.roleCodes);
      user.roleCodes = [...body.roleCodes];
    }

    user.displayName = body.displayName ?? user.displayName;
    user.passwordHash = body.password
      ? hashPassword(body.password)
      : user.passwordHash;
    user.enabled = body.enabled ?? user.enabled;

    return this.toUserSummary(user);
  }

  async deleteUser(id: string): Promise<{ deleted: true }> {
    const index = this.users.findIndex((user) => user.id === id);

    if (index === -1) {
      throw new NotFoundException(`User not found: ${id}`);
    }

    this.users.splice(index, 1);
    return { deleted: true };
  }

  async findUserByUsername(
    username: string,
  ): Promise<RbacUserRecord | undefined> {
    return this.users.find((user) => user.username === username);
  }

  async findUserById(id: string): Promise<RbacUserRecord | undefined> {
    return this.users.find((user) => user.id === id);
  }

  async listRoles(): Promise<RoleSummaryRecord[]> {
    return this.roles.map((role) => ({
      id: role.id,
      code: role.code,
      name: role.name,
      permissionCodes: [...role.permissionCodes],
      system: role.system,
    }));
  }

  async createRole(body: CreateRoleRecord): Promise<RoleSummaryRecord> {
    if (this.roles.some((role) => role.code === body.code)) {
      throw new ConflictException(`Role already exists: ${body.code}`);
    }

    this.assertPermissionCodes(body.permissionCodes);
    const role = {
      id: `role_${body.code}`,
      code: body.code,
      name: body.name,
      permissionCodes: [...body.permissionCodes],
      system: body.system ?? false,
    };
    this.roles.push(role);
    return this.toRoleSummary(role);
  }

  async updateRole(
    code: string,
    body: UpdateRoleRecord,
  ): Promise<RoleSummaryRecord> {
    const role = this.findMutableRoleByCode(code);

    if (body.permissionCodes) {
      this.assertPermissionCodes(body.permissionCodes);
      role.permissionCodes = [...body.permissionCodes];
    }

    role.name = body.name ?? role.name;
    role.system = body.system ?? role.system;
    return this.toRoleSummary(role);
  }

  async deleteRole(code: string): Promise<{ deleted: true }> {
    const index = this.roles.findIndex((role) => role.code === code);

    if (index === -1) {
      throw new NotFoundException(`Role not found: ${code}`);
    }

    if (this.roles[index].system) {
      throw new BadRequestException('System roles cannot be deleted.');
    }

    this.roles.splice(index, 1);
    for (const user of this.users) {
      user.roleCodes = user.roleCodes.filter((roleCode) => roleCode !== code);
    }
    return { deleted: true };
  }

  async listPermissions(): Promise<PermissionSummaryRecord[]> {
    return this.permissions.map((permission) => ({ ...permission }));
  }

  async createPermission(
    body: CreatePermissionRecord,
  ): Promise<PermissionSummaryRecord> {
    if (this.permissions.some((permission) => permission.code === body.code)) {
      throw new ConflictException(`Permission already exists: ${body.code}`);
    }

    const permission = {
      code: body.code,
      title: body.title,
      stage: 'S6',
      dangerous: false,
    };
    this.permissions.push(permission);
    return permission;
  }

  async updatePermission(
    code: string,
    body: UpdatePermissionRecord,
  ): Promise<PermissionSummaryRecord> {
    const permission = this.findMutablePermissionByCode(code);
    permission.title = body.title ?? permission.title;
    return { ...permission };
  }

  async deletePermission(code: string): Promise<{ deleted: true }> {
    const index = this.permissions.findIndex(
      (permission) => permission.code === code,
    );

    if (index === -1) {
      throw new NotFoundException(`Permission not found: ${code}`);
    }

    this.permissions.splice(index, 1);
    for (const role of this.roles) {
      role.permissionCodes = role.permissionCodes.filter(
        (permissionCode) => permissionCode !== code,
      );
    }
    for (const menu of this.menus) {
      if (menu.permissionCode === code) {
        delete menu.permissionCode;
      }
    }
    return { deleted: true };
  }

  async listMenus(): Promise<MenuSummaryRecord[]> {
    return this.menus.map((menu) => ({ ...menu }));
  }

  async createMenu(body: CreateMenuRecord): Promise<MenuSummaryRecord> {
    if (this.menus.some((menu) => menu.key === body.key)) {
      throw new ConflictException(`Menu already exists: ${body.key}`);
    }

    if (body.permissionCode) {
      this.assertPermissionCodes([body.permissionCode]);
    }

    const menu = {
      key: body.key,
      title: body.title,
      path: body.path,
      permissionCode: body.permissionCode,
      stage: 'S6',
      order: body.order,
    };
    this.menus.push(menu);
    return { ...menu };
  }

  async updateMenu(
    key: string,
    body: UpdateMenuRecord,
  ): Promise<MenuSummaryRecord> {
    const menu = this.findMutableMenuByKey(key);

    if (body.permissionCode) {
      this.assertPermissionCodes([body.permissionCode]);
      menu.permissionCode = body.permissionCode;
    }

    menu.title = body.title ?? menu.title;
    menu.path = body.path ?? menu.path;
    menu.order = body.order ?? menu.order;
    return { ...menu };
  }

  async deleteMenu(key: string): Promise<{ deleted: true }> {
    const index = this.menus.findIndex((menu) => menu.key === key);

    if (index === -1) {
      throw new NotFoundException(`Menu not found: ${key}`);
    }

    this.menus.splice(index, 1);
    return { deleted: true };
  }

  async getPermissionCodesForUser(userId: string): Promise<string[]> {
    const user = await this.findUserById(userId);

    if (!user || !user.enabled) {
      return [];
    }

    return [
      ...new Set(
        this.roles
          .filter((role) => user.roleCodes.includes(role.code))
          .flatMap((role) => role.permissionCodes),
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
    this.loginAttempts.push({ ...record });
  }

  listRecordedLoginAttempts(): readonly LoginAttemptRecord[] {
    return this.loginAttempts.map((record) => ({ ...record }));
  }

  private toUserSummary(user: RbacUserRecord): UserSummaryRecord {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      roleCodes: [...user.roleCodes],
      enabled: user.enabled,
    };
  }

  private toRoleSummary(role: RoleSummaryRecord): RoleSummaryRecord {
    return {
      id: role.id,
      code: role.code,
      name: role.name,
      permissionCodes: [...role.permissionCodes],
      system: role.system,
    };
  }

  private findMutableUserById(id: string): RbacUserRecord {
    const user = this.users.find((candidate) => candidate.id === id);

    if (!user) {
      throw new NotFoundException(`User not found: ${id}`);
    }

    return user;
  }

  private findMutableRoleByCode(code: string): RoleSummaryRecord {
    const role = this.roles.find((candidate) => candidate.code === code);

    if (!role) {
      throw new NotFoundException(`Role not found: ${code}`);
    }

    return role;
  }

  private findMutablePermissionByCode(code: string): PermissionSummaryRecord {
    const permission = this.permissions.find(
      (candidate) => candidate.code === code,
    );

    if (!permission) {
      throw new NotFoundException(`Permission not found: ${code}`);
    }

    return permission;
  }

  private findMutableMenuByKey(key: string): MenuSummaryRecord {
    const menu = this.menus.find((candidate) => candidate.key === key);

    if (!menu) {
      throw new NotFoundException(`Menu not found: ${key}`);
    }

    return menu;
  }

  private assertRoleCodes(roleCodes: readonly string[]): void {
    const knownRoleCodes = new Set(this.roles.map((role) => role.code));
    const missingRoleCode = roleCodes.find(
      (roleCode) => !knownRoleCodes.has(roleCode),
    );

    if (missingRoleCode) {
      throw new NotFoundException(`Role not found: ${missingRoleCode}`);
    }
  }

  private assertPermissionCodes(permissionCodes: readonly string[]): void {
    const knownPermissionCodes = new Set(
      this.permissions.map((permission) => permission.code),
    );
    const missingPermissionCode = permissionCodes.find(
      (permissionCode) => !knownPermissionCodes.has(permissionCode),
    );

    if (missingPermissionCode) {
      throw new NotFoundException(
        `Permission not found: ${missingPermissionCode}`,
      );
    }
  }
}
