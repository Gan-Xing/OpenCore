import { ApiProperty } from '@nestjs/swagger';

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

export class UserSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  username!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty({ type: [String] })
  roleCodes!: readonly string[];

  @ApiProperty()
  enabled!: boolean;
}

export class CreateUserDto {
  @ApiProperty({ example: 'operator' })
  username!: string;

  @ApiProperty({ example: 'Operations User' })
  displayName!: string;

  @ApiProperty()
  password!: string;

  @ApiProperty({ type: [String], default: [] })
  roleCodes!: readonly string[];

  @ApiProperty({ required: false, default: true })
  enabled?: boolean;
}

export class UpdateUserDto {
  @ApiProperty({ required: false })
  displayName?: string;

  @ApiProperty({ required: false })
  password?: string;

  @ApiProperty({ required: false, type: [String] })
  roleCodes?: readonly string[];

  @ApiProperty({ required: false })
  enabled?: boolean;
}

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
}

export class UpdateRoleDto {
  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({ required: false, type: [String] })
  permissionCodes?: readonly string[];

  @ApiProperty({ required: false })
  system?: boolean;
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

export class MenuSummaryDto {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  path!: string;

  @ApiProperty({ required: false })
  permissionCode?: string;

  @ApiProperty()
  stage!: string;

  @ApiProperty()
  order!: number;
}

export class CreateMenuDto {
  @ApiProperty({ example: 'system.examples' })
  key!: string;

  @ApiProperty({ example: 'Examples' })
  title!: string;

  @ApiProperty({ example: '/system/examples' })
  path!: string;

  @ApiProperty({ required: false })
  permissionCode?: string;

  @ApiProperty()
  order!: number;
}

export class UpdateMenuDto {
  @ApiProperty({ required: false })
  title?: string;

  @ApiProperty({ required: false })
  path?: string;

  @ApiProperty({ required: false })
  permissionCode?: string;

  @ApiProperty({ required: false })
  order?: number;
}

export class DeleteResultDto {
  @ApiProperty()
  deleted!: true;
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
