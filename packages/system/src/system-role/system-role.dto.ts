import { ApiProperty } from '@nestjs/swagger';
import { MenuSummaryDto } from '../system-menu/system-menu.dto';
import {
  systemRoleDataScopeTypes,
  type SystemRoleDataScope,
} from './system-role.records';

export class RoleSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: [String] })
  permissionCodes!: readonly string[];

  @ApiProperty()
  system!: boolean;

  @ApiProperty({ enum: systemRoleDataScopeTypes })
  dataScope!: SystemRoleDataScope;

  @ApiProperty({ type: [String] })
  dataScopeDeptIds!: readonly string[];
}

export class CreateRoleDto {
  @ApiProperty({ example: 'operator' })
  code!: string;

  @ApiProperty({ example: 'Operator' })
  name!: string;

  @ApiProperty({ type: [String], default: [] })
  permissionCodes!: readonly string[];

  @ApiProperty({ required: false, default: false })
  system?: boolean;

  @ApiProperty({
    required: false,
    enum: systemRoleDataScopeTypes,
    default: 'all',
  })
  dataScope?: SystemRoleDataScope;

  @ApiProperty({ required: false, type: [String], default: [] })
  dataScopeDeptIds?: readonly string[];
}

export class UpdateRoleDto {
  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({ required: false, type: [String] })
  permissionCodes?: readonly string[];

  @ApiProperty({ required: false })
  system?: boolean;

  @ApiProperty({ required: false, enum: systemRoleDataScopeTypes })
  dataScope?: SystemRoleDataScope;

  @ApiProperty({ required: false, type: [String] })
  dataScopeDeptIds?: readonly string[];
}

export class AssignRoleMenusDto {
  @ApiProperty({ type: [String] })
  menuKeys!: readonly string[];
}

export class RoleMenuAssignmentDto {
  @ApiProperty()
  roleCode!: string;

  @ApiProperty({ type: [String] })
  menuKeys!: readonly string[];

  @ApiProperty({ type: [String] })
  permissionCodes!: readonly string[];

  @ApiProperty({ type: [String] })
  preservedPermissionCodes!: readonly string[];

  @ApiProperty({ type: [MenuSummaryDto] })
  menus!: readonly MenuSummaryDto[];

  @ApiProperty({ required: false })
  revokedSessionCount?: number;
}
