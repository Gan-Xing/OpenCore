import { ApiProperty } from '@nestjs/swagger';
export {
  AssignRoleMenusDto,
  AssignRoleUsersDto,
  CreateMenuDto,
  CreateRoleDto,
  CreateUserDto,
  ListUsersQueryDto,
  MenuSummaryDto,
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
  UpdateRoleDto,
  UpdateUserDto,
  UserOptionDto,
  UserProfileDto,
  UserMutationResultDto,
  UserSummaryDto,
} from '@opencore/system';

export class LoginRequestDto {
  @ApiProperty({ example: 'admin' })
  username!: string;

  @ApiProperty({ example: 'admin123' })
  password!: string;
}

export class AuthenticatedUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  username!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty({ type: [String] })
  roleCodes!: readonly string[];

  @ApiProperty({ type: [String] })
  permissionCodes!: readonly string[];
}

export class LoginResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType!: 'Bearer';

  @ApiProperty()
  expiresInSeconds!: number;

  @ApiProperty({ type: AuthenticatedUserDto })
  user!: AuthenticatedUserDto;
}

export class PermissionSummaryDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  stage!: string;

  @ApiProperty()
  dangerous!: boolean;

  @ApiProperty()
  system!: boolean;
}

export class CreatePermissionDto {
  @ApiProperty({ example: 'core:example:read' })
  code!: string;

  @ApiProperty({ example: 'Read examples' })
  title!: string;
}

export class UpdatePermissionDto {
  @ApiProperty({ required: false })
  title?: string;
}

export class DeleteResultDto {
  @ApiProperty()
  deleted!: true;

  @ApiProperty({ required: false })
  revokedSessionCount?: number;
}

export class UserPasswordMutationResultDto {
  @ApiProperty()
  changed!: true;

  @ApiProperty()
  revokedSessionCount!: number;
}

export class RbacExportPreviewDto {
  @ApiProperty()
  filename!: string;

  @ApiProperty({ example: 'current-page' })
  scope!: 'current-page';

  @ApiProperty({ type: [String] })
  columns!: readonly string[];

  @ApiProperty()
  rowCount!: number;

  @ApiProperty()
  generatedAt!: string;
}
