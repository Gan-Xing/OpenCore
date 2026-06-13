import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { OnlineUserService } from '@opencore/online-user';
import {
  SystemMenuService,
  SystemRoleService,
  SystemUserService,
} from '@opencore/system';
import {
  AssignRoleMenusDto,
  AssignRoleUsersDto,
  CreateMenuDto,
  CreatePermissionDto,
  CreateRoleDto,
  CreateUserDto,
  DeleteResultDto,
  ListUsersQueryDto,
  MenuSummaryDto,
  PermissionSummaryDto,
  RbacExportPreviewDto,
  RoleMenuAssignmentDto,
  RoleMutationResultDto,
  ResetUserPasswordDto,
  RoleUserAssignmentDto,
  RoleSummaryDto,
  SetRoleStatusDto,
  SetUserStatusDto,
  UpdateUserPasswordDto,
  UpdateUserProfileDto,
  UpdateMenuDto,
  UpdatePermissionDto,
  UpdateRoleDto,
  UpdateUserDto,
  UserOptionDto,
  UserProfileDto,
  UserPasswordMutationResultDto,
  UserMutationResultDto,
  UserSummaryDto,
} from './rbac.dto';
import {
  RequireAuthenticated,
  RequirePermission,
} from './permissions.decorator';
import { RbacRepository } from './rbac.repository';

type RequestWithUser = {
  user?: {
    id: string;
  };
};

@ApiBearerAuth()
@Controller('core')
export class RbacController {
  constructor(
    private readonly repository: RbacRepository,
    private readonly users: SystemUserService,
    private readonly roles: SystemRoleService,
    private readonly menus: SystemMenuService,
    private readonly onlineUsers: OnlineUserService,
  ) {}

  @Get('users')
  @ApiTags('Core Users')
  @RequirePermission('core:user:read')
  @ApiOkResponse({ type: [UserSummaryDto] })
  listUsers(@Query() query: ListUsersQueryDto): Promise<UserSummaryDto[]> {
    return this.users.listUsers(query);
  }

  @Get('users/export')
  @ApiTags('Core Users')
  @RequirePermission('core:user:export')
  @ApiOkResponse({ type: RbacExportPreviewDto })
  exportUsers(
    @Query() query: ListUsersQueryDto,
  ): Promise<RbacExportPreviewDto> {
    return this.users.createExportPreview(query);
  }

  @Get('users/simple-list')
  @ApiTags('Core Users')
  @RequireAuthenticated()
  @ApiOkResponse({ type: [UserOptionDto] })
  listUserOptions(
    @Query() query: ListUsersQueryDto,
  ): Promise<readonly UserOptionDto[]> {
    return this.users.listUserOptions(query);
  }

  @Get('users/profile')
  @ApiTags('Core Users')
  @RequireAuthenticated()
  @ApiOkResponse({ type: UserProfileDto })
  getUserProfile(@Req() request: RequestWithUser): Promise<UserProfileDto> {
    return this.users.getUser(getAuthenticatedUserId(request));
  }

  @Patch('users/profile')
  @ApiTags('Core Users')
  @RequireAuthenticated()
  @ApiOkResponse({ type: UserProfileDto })
  updateUserProfile(
    @Req() request: RequestWithUser,
    @Body() body: UpdateUserProfileDto,
  ): Promise<UserProfileDto> {
    return this.users.updateUserProfile(getAuthenticatedUserId(request), body);
  }

  @Patch('users/profile/password')
  @ApiTags('Core Users')
  @RequireAuthenticated()
  @ApiOkResponse({ type: UserPasswordMutationResultDto })
  async updateUserProfilePassword(
    @Req() request: RequestWithUser,
    @Body() body: UpdateUserPasswordDto,
  ): Promise<UserPasswordMutationResultDto> {
    const user = await this.users.updateUserPassword(
      getAuthenticatedUserId(request),
      body,
    );
    const revokedSessionCount = await this.revokeActiveSessionsForUsernames(
      [user.username],
      'rbac.user-profile-password',
      `user changed own password for ${user.username}`,
    );

    return {
      changed: true,
      revokedSessionCount,
    };
  }

  @Get('users/:id')
  @ApiTags('Core Users')
  @RequirePermission('core:user:read')
  @ApiOkResponse({ type: UserSummaryDto })
  getUser(@Param('id') id: string): Promise<UserSummaryDto> {
    return this.users.getUser(id);
  }

  @Post('users')
  @ApiTags('Core Users')
  @RequirePermission('core:user:create')
  @ApiOkResponse({ type: UserSummaryDto })
  createUser(@Body() body: CreateUserDto): Promise<UserSummaryDto> {
    return this.users.createUser(body);
  }

  @Patch('users/:id')
  @ApiTags('Core Users')
  @RequirePermission('core:user:update')
  @ApiOkResponse({ type: UserMutationResultDto })
  async updateUser(
    @Param('id') id: string,
    @Body() body: UpdateUserDto,
  ): Promise<UserMutationResultDto> {
    const before = await this.users.getUser(id);
    const user = await this.users.updateUser(id, body);
    const revokedSessionCount = await this.revokeActiveSessionsForUsernames(
      [before.username],
      'rbac.user-update',
      `user updated for ${before.username}`,
    );

    return {
      ...user,
      revokedSessionCount,
    };
  }

  @Patch('users/:id/status')
  @ApiTags('Core Users')
  @RequirePermission('core:user:update')
  @ApiOkResponse({ type: UserMutationResultDto })
  async setUserStatus(
    @Param('id') id: string,
    @Body() body: SetUserStatusDto,
  ): Promise<UserMutationResultDto> {
    const before = await this.users.getUser(id);
    const user = await this.users.setUserStatus(id, body);
    const revokedSessionCount = await this.revokeActiveSessionsForUsernames(
      [before.username],
      'rbac.user-status',
      `user status set to ${user.enabled ? 'enabled' : 'disabled'} for ${before.username}`,
    );

    return {
      ...user,
      revokedSessionCount,
    };
  }

  @Post('users/:id/reset-password')
  @ApiTags('Core Users')
  @RequirePermission('core:user:update')
  @ApiOkResponse({ type: UserMutationResultDto })
  async resetUserPassword(
    @Param('id') id: string,
    @Body() body: ResetUserPasswordDto,
  ): Promise<UserMutationResultDto> {
    const before = await this.users.getUser(id);
    const user = await this.users.resetUserPassword(id, body);
    const revokedSessionCount = await this.revokeActiveSessionsForUsernames(
      [before.username],
      'rbac.user-reset-password',
      `user password reset for ${before.username}`,
    );

    return {
      ...user,
      revokedSessionCount,
    };
  }

  @Delete('users/:id')
  @ApiTags('Core Users')
  @RequirePermission('core:user:delete')
  @ApiOkResponse({ type: DeleteResultDto })
  async deleteUser(@Param('id') id: string): Promise<DeleteResultDto> {
    const before = await this.users.getUser(id);
    const result = await this.users.deleteUser(id);
    const revokedSessionCount = await this.revokeActiveSessionsForUsernames(
      [before.username],
      'rbac.user-delete',
      `user deleted for ${before.username}`,
    );

    return {
      ...result,
      revokedSessionCount,
    };
  }

  @Get('roles')
  @ApiTags('Core Roles')
  @RequirePermission('core:role:read')
  @ApiOkResponse({ type: [RoleSummaryDto] })
  listRoles(): Promise<RoleSummaryDto[]> {
    return this.roles.listRoles();
  }

  @Get('roles/export')
  @ApiTags('Core Roles')
  @RequirePermission('core:role:export')
  @ApiOkResponse({ type: RbacExportPreviewDto })
  exportRoles(): Promise<RbacExportPreviewDto> {
    return this.roles.createExportPreview();
  }

  @Get('roles/:code/menus')
  @ApiTags('Core Roles')
  @RequirePermission('core:role:read')
  @ApiOkResponse({ type: RoleMenuAssignmentDto })
  getRoleMenuAssignment(
    @Param('code') code: string,
  ): Promise<RoleMenuAssignmentDto> {
    return this.roles.getRoleMenuAssignment(code);
  }

  @Patch('roles/:code/menus')
  @ApiTags('Core Roles')
  @RequirePermission('core:role:update')
  @ApiOkResponse({ type: RoleMenuAssignmentDto })
  async assignRoleMenus(
    @Param('code') code: string,
    @Body() body: AssignRoleMenusDto,
  ): Promise<RoleMenuAssignmentDto> {
    const assignment = await this.roles.assignRoleMenus(code, body);
    const revokedSessionCount = await this.revokeActiveSessionsForRole(
      code,
      'rbac.role-menu-assignment',
      `role menu assignment updated for ${code}`,
    );

    return {
      ...assignment,
      revokedSessionCount,
    };
  }

  @Get('roles/:code/users')
  @ApiTags('Core Roles')
  @RequirePermission('core:role:read')
  @ApiOkResponse({ type: RoleUserAssignmentDto })
  getRoleUserAssignment(
    @Param('code') code: string,
  ): Promise<RoleUserAssignmentDto> {
    return this.users.getRoleUserAssignment(code);
  }

  @Patch('roles/:code/users')
  @ApiTags('Core Roles')
  @RequirePermission('core:role:update')
  @ApiOkResponse({ type: RoleUserAssignmentDto })
  async assignRoleUsers(
    @Param('code') code: string,
    @Body() body: AssignRoleUsersDto,
  ): Promise<RoleUserAssignmentDto> {
    const before = await this.users.getRoleUserAssignment(code);
    const assignment = await this.users.assignRoleUsers(code, body);
    const revokedSessionCount = await this.revokeActiveSessionsForUsernames(
      findChangedRoleAssignmentUsernames(before, assignment),
      'rbac.role-user-assignment',
      `role user assignment updated for ${code}`,
    );

    return {
      ...assignment,
      revokedSessionCount,
    };
  }

  @Get('roles/:code')
  @ApiTags('Core Roles')
  @RequirePermission('core:role:read')
  @ApiOkResponse({ type: RoleSummaryDto })
  getRole(@Param('code') code: string): Promise<RoleSummaryDto> {
    return this.roles.getRole(code);
  }

  @Post('roles')
  @ApiTags('Core Roles')
  @RequirePermission('core:role:create')
  @ApiOkResponse({ type: RoleSummaryDto })
  createRole(@Body() body: CreateRoleDto): Promise<RoleSummaryDto> {
    return this.roles.createRole(body);
  }

  @Patch('roles/:code')
  @ApiTags('Core Roles')
  @RequirePermission('core:role:update')
  @ApiOkResponse({ type: RoleMutationResultDto })
  async updateRole(
    @Param('code') code: string,
    @Body() body: UpdateRoleDto,
  ): Promise<RoleMutationResultDto> {
    const usernames = await this.listUsernamesForRole(code);
    const role = await this.roles.updateRole(code, body);
    const revokedSessionCount = await this.revokeActiveSessionsForUsernames(
      usernames,
      'rbac.role-update',
      `role updated for ${code}`,
    );

    return {
      ...role,
      revokedSessionCount,
    };
  }

  @Patch('roles/:code/status')
  @ApiTags('Core Roles')
  @RequirePermission('core:role:update')
  @ApiOkResponse({ type: RoleMutationResultDto })
  async setRoleStatus(
    @Param('code') code: string,
    @Body() body: SetRoleStatusDto,
  ): Promise<RoleMutationResultDto> {
    const usernames = await this.listUsernamesForRole(code);
    const role = await this.roles.setRoleStatus(code, body);
    const revokedSessionCount = await this.revokeActiveSessionsForUsernames(
      usernames,
      'rbac.role-status',
      `role status set to ${role.enabled ? 'enabled' : 'disabled'} for ${code}`,
    );

    return {
      ...role,
      revokedSessionCount,
    };
  }

  @Delete('roles/:code')
  @ApiTags('Core Roles')
  @RequirePermission('core:role:delete')
  @ApiOkResponse({ type: DeleteResultDto })
  async deleteRole(@Param('code') code: string): Promise<DeleteResultDto> {
    const usernames = await this.listUsernamesForRole(code);
    const result = await this.roles.deleteRole(code);
    const revokedSessionCount = await this.revokeActiveSessionsForUsernames(
      usernames,
      'rbac.role-delete',
      `role deleted for ${code}`,
    );

    return {
      ...result,
      revokedSessionCount,
    };
  }

  @Get('permissions')
  @ApiTags('Core Permissions')
  @RequirePermission('core:permission:read')
  @ApiOkResponse({ type: [PermissionSummaryDto] })
  listPermissions(): Promise<PermissionSummaryDto[]> {
    return this.repository.listPermissions();
  }

  @Get('permissions/export')
  @ApiTags('Core Permissions')
  @RequirePermission('core:permission:export')
  @ApiOkResponse({ type: RbacExportPreviewDto })
  exportPermissions(): Promise<RbacExportPreviewDto> {
    return this.repository.createExportPreview('permissions');
  }

  @Get('permissions/:code')
  @ApiTags('Core Permissions')
  @RequirePermission('core:permission:read')
  @ApiOkResponse({ type: PermissionSummaryDto })
  getPermission(@Param('code') code: string): Promise<PermissionSummaryDto> {
    return this.repository.getPermission(code);
  }

  @Post('permissions')
  @ApiTags('Core Permissions')
  @RequirePermission('core:permission:create')
  @ApiOkResponse({ type: PermissionSummaryDto })
  createPermission(
    @Body() body: CreatePermissionDto,
  ): Promise<PermissionSummaryDto> {
    return this.repository.createPermission(body);
  }

  @Patch('permissions/:code')
  @ApiTags('Core Permissions')
  @RequirePermission('core:permission:update')
  @ApiOkResponse({ type: PermissionSummaryDto })
  updatePermission(
    @Param('code') code: string,
    @Body() body: UpdatePermissionDto,
  ): Promise<PermissionSummaryDto> {
    return this.repository.updatePermission(code, body);
  }

  @Delete('permissions/:code')
  @ApiTags('Core Permissions')
  @RequirePermission('core:permission:delete')
  @ApiOkResponse({ type: DeleteResultDto })
  deletePermission(@Param('code') code: string): Promise<DeleteResultDto> {
    return this.repository.deletePermission(code);
  }

  @Get('menus')
  @ApiTags('Core Menus')
  @RequirePermission('core:menu:read')
  @ApiOkResponse({ type: [MenuSummaryDto] })
  listMenus(): Promise<MenuSummaryDto[]> {
    return this.menus.listMenus();
  }

  @Get('menus/export')
  @ApiTags('Core Menus')
  @RequirePermission('core:menu:export')
  @ApiOkResponse({ type: RbacExportPreviewDto })
  exportMenus(): Promise<RbacExportPreviewDto> {
    return this.menus.createExportPreview();
  }

  @Get('menus/:key')
  @ApiTags('Core Menus')
  @RequirePermission('core:menu:read')
  @ApiOkResponse({ type: MenuSummaryDto })
  getMenu(@Param('key') key: string): Promise<MenuSummaryDto> {
    return this.menus.getMenu(key);
  }

  @Post('menus')
  @ApiTags('Core Menus')
  @RequirePermission('core:menu:create')
  @ApiOkResponse({ type: MenuSummaryDto })
  createMenu(@Body() body: CreateMenuDto): Promise<MenuSummaryDto> {
    return this.menus.createMenu(body);
  }

  @Patch('menus/:key')
  @ApiTags('Core Menus')
  @RequirePermission('core:menu:update')
  @ApiOkResponse({ type: MenuSummaryDto })
  updateMenu(
    @Param('key') key: string,
    @Body() body: UpdateMenuDto,
  ): Promise<MenuSummaryDto> {
    return this.menus.updateMenu(key, body);
  }

  @Delete('menus/:key')
  @ApiTags('Core Menus')
  @RequirePermission('core:menu:delete')
  @ApiOkResponse({ type: DeleteResultDto })
  deleteMenu(@Param('key') key: string): Promise<DeleteResultDto> {
    return this.menus.deleteMenu(key);
  }

  private async revokeActiveSessionsForRole(
    roleCode: string,
    actor: string,
    reason: string,
  ): Promise<number> {
    return this.revokeActiveSessionsForUsernames(
      await this.listUsernamesForRole(roleCode),
      actor,
      reason,
    );
  }

  private async listUsernamesForRole(roleCode: string): Promise<string[]> {
    return (await this.users.listUsers())
      .filter((user) => user.roleCodes.includes(roleCode))
      .map((user) => user.username);
  }

  private async revokeActiveSessionsForUsernames(
    usernames: readonly string[],
    actor: string,
    reason: string,
  ): Promise<number> {
    const uniqueUsernames = [...new Set(usernames)];
    const sessionIds = (
      await Promise.all(
        uniqueUsernames.map((username) =>
          this.listActiveSessionIdsByUsername(username),
        ),
      )
    ).flat();

    if (sessionIds.length === 0) {
      return 0;
    }

    const result = await this.onlineUsers.kickOutSessions({
      ids: sessionIds,
      actor,
      reason,
    });

    return result.kicked;
  }

  private async listActiveSessionIdsByUsername(
    username: string,
  ): Promise<string[]> {
    const ids: string[] = [];
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      const result = await this.onlineUsers.listOnlineUsers({
        username,
        active: true,
        page,
        pageSize: 100,
      });

      ids.push(
        ...result.items
          .filter((session) => session.username === username)
          .map((session) => session.id),
      );
      totalPages = result.totalPages;
      page += 1;
    }

    return ids;
  }
}

function getAuthenticatedUserId(request: RequestWithUser): string {
  const userId = request.user?.id;

  if (!userId) {
    throw new UnauthorizedException('Missing authenticated user');
  }

  return userId;
}

function findChangedRoleAssignmentUsernames(
  before: RoleUserAssignmentDto,
  after: RoleUserAssignmentDto,
): readonly string[] {
  const beforeIds = new Set(before.assignedUserIds);
  const afterIds = new Set(after.assignedUserIds);
  const usersById = new Map(
    [
      ...before.assignedUsers,
      ...before.availableUsers,
      ...after.assignedUsers,
      ...after.availableUsers,
    ].map((user) => [user.id, user]),
  );

  return [...new Set([...beforeIds, ...afterIds])]
    .filter((userId) => beforeIds.has(userId) !== afterIds.has(userId))
    .map((userId) => usersById.get(userId)?.username)
    .filter((username): username is string => Boolean(username));
}
