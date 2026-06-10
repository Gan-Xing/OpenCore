import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  MenuSummaryDto,
  PermissionSummaryDto,
  RoleSummaryDto,
  UserSummaryDto,
} from './rbac.dto';
import { RequirePermission } from './permissions.decorator';
import { RbacRepository } from './rbac.repository';

@ApiBearerAuth()
@ApiTags('Core RBAC')
@Controller('core')
export class RbacController {
  constructor(private readonly repository: RbacRepository) {}

  @Get('users')
  @RequirePermission('core:user:read')
  @ApiOkResponse({ type: [UserSummaryDto] })
  listUsers(): Promise<UserSummaryDto[]> {
    return this.repository.listUsers();
  }

  @Get('roles')
  @RequirePermission('core:role:read')
  @ApiOkResponse({ type: [RoleSummaryDto] })
  listRoles(): Promise<RoleSummaryDto[]> {
    return this.repository.listRoles();
  }

  @Get('permissions')
  @RequirePermission('core:permission:read')
  @ApiOkResponse({ type: [PermissionSummaryDto] })
  listPermissions(): Promise<PermissionSummaryDto[]> {
    return this.repository.listPermissions();
  }

  @Get('menus')
  @RequirePermission('core:menu:read')
  @ApiOkResponse({ type: [MenuSummaryDto] })
  listMenus(): Promise<MenuSummaryDto[]> {
    return this.repository.listMenus();
  }
}
