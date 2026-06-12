import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  SystemMenuService,
  SystemRoleService,
  SystemUserService,
} from '@opencore/system';
import {
  CreateMenuDto,
  CreatePermissionDto,
  CreateRoleDto,
  CreateUserDto,
  DeleteResultDto,
  MenuSummaryDto,
  PermissionSummaryDto,
  RbacExportPreviewDto,
  RoleSummaryDto,
  UpdateMenuDto,
  UpdatePermissionDto,
  UpdateRoleDto,
  UpdateUserDto,
  UserSummaryDto,
} from './rbac.dto';
import { RequirePermission } from './permissions.decorator';
import { RbacRepository } from './rbac.repository';

@ApiBearerAuth()
@Controller('core')
export class RbacController {
  constructor(
    private readonly repository: RbacRepository,
    private readonly users: SystemUserService,
    private readonly roles: SystemRoleService,
    private readonly menus: SystemMenuService,
  ) {}

  @Get('users')
  @ApiTags('Core Users')
  @RequirePermission('core:user:read')
  @ApiOkResponse({ type: [UserSummaryDto] })
  listUsers(): Promise<UserSummaryDto[]> {
    return this.users.listUsers();
  }

  @Get('users/export')
  @ApiTags('Core Users')
  @RequirePermission('core:user:export')
  @ApiOkResponse({ type: RbacExportPreviewDto })
  exportUsers(): Promise<RbacExportPreviewDto> {
    return this.users.createExportPreview();
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
  @ApiOkResponse({ type: UserSummaryDto })
  updateUser(
    @Param('id') id: string,
    @Body() body: UpdateUserDto,
  ): Promise<UserSummaryDto> {
    return this.users.updateUser(id, body);
  }

  @Delete('users/:id')
  @ApiTags('Core Users')
  @RequirePermission('core:user:delete')
  @ApiOkResponse({ type: DeleteResultDto })
  deleteUser(@Param('id') id: string): Promise<DeleteResultDto> {
    return this.users.deleteUser(id);
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
  @ApiOkResponse({ type: RoleSummaryDto })
  updateRole(
    @Param('code') code: string,
    @Body() body: UpdateRoleDto,
  ): Promise<RoleSummaryDto> {
    return this.roles.updateRole(code, body);
  }

  @Delete('roles/:code')
  @ApiTags('Core Roles')
  @RequirePermission('core:role:delete')
  @ApiOkResponse({ type: DeleteResultDto })
  deleteRole(@Param('code') code: string): Promise<DeleteResultDto> {
    return this.roles.deleteRole(code);
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
}
