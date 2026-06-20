import { ApiProperty } from '@nestjs/swagger';
import { LoginLogDto } from '@opencore/audit';
import {
  BatchKickOutSessionsResultDto,
  OnlineUserSessionDto,
} from '@opencore/online-user';
export {
  AssignRoleMenusDto,
  AssignRoleUsersDto,
  AssignUserRolesDto,
  BatchDeleteUsersDto,
  BatchSetUserStatusDto,
  BatchUserMutationResultDto,
  CreateMenuDto,
  CreateRoleDto,
  CreateUserDto,
  ImportUsersDto,
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
  UploadUserAvatarDto,
  UpdateMenuDto,
  UpdateRoleDto,
  UpdateUserDto,
  UserImportResultDto,
  UserImportTemplateDto,
  UserOptionDto,
  UserPageDto,
  UserProfileDto,
  UserRoleAssignmentDto,
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

  @ApiProperty({ required: false, nullable: true, type: String })
  avatarUrl?: string;
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

export class LogoutResponseDto {
  @ApiProperty()
  loggedOut!: true;
}

export type SocialAuthProviderStatus = 'ready' | 'requires_configuration';
export type SocialAuthProviderIssue =
  | 'disabled'
  | 'missing_config'
  | 'placeholder_client'
  | 'secret_unverified'
  | 'unsupported_provider';
export type SocialAuthResultStatus =
  | 'authenticated'
  | 'failed'
  | 'requires_binding';

export class SocialAuthProviderDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  icon!: string;

  @ApiProperty({ enum: ['ready', 'requires_configuration'] })
  status!: SocialAuthProviderStatus;

  @ApiProperty({
    enum: [
      'disabled',
      'missing_config',
      'placeholder_client',
      'secret_unverified',
      'unsupported_provider',
    ],
    required: false,
  })
  issue?: SocialAuthProviderIssue;

  @ApiProperty()
  message!: string;
}

export class StartSocialAuthFlowDto {
  @ApiProperty({ example: 'oauth.github' })
  providerCode!: string;

  @ApiProperty({ required: false })
  redirect?: string;
}

export class SocialAuthFlowDto {
  @ApiProperty()
  providerCode!: string;

  @ApiProperty()
  state!: string;

  @ApiProperty()
  authorizationUrl!: string;

  @ApiProperty()
  expiresAt!: string;
}

export class CompleteSocialAuthDto {
  @ApiProperty({ example: 'oauth.github' })
  providerCode!: string;

  @ApiProperty()
  state!: string;
}

export class BindSocialAuthLoginDto extends CompleteSocialAuthDto {
  @ApiProperty({ example: 'admin' })
  username!: string;

  @ApiProperty({ example: 'admin123' })
  password!: string;
}

export class SocialAuthResultDto {
  @ApiProperty({ enum: ['authenticated', 'failed', 'requires_binding'] })
  status!: SocialAuthResultStatus;

  @ApiProperty()
  providerCode!: string;

  @ApiProperty({ required: false })
  providerAccountId?: string;

  @ApiProperty()
  message!: string;

  @ApiProperty({ type: LoginResponseDto, required: false })
  session?: LoginResponseDto;
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

export class UserProfileSessionDto extends OnlineUserSessionDto {
  @ApiProperty()
  current!: boolean;
}

export class UserProfileActivityDto {
  @ApiProperty({ type: [UserProfileSessionDto] })
  sessions!: readonly UserProfileSessionDto[];

  @ApiProperty({ type: [LoginLogDto] })
  loginLogs!: readonly LoginLogDto[];

  @ApiProperty()
  currentTokenId!: string;
}

export class UserProfileKickOutOtherSessionsDto extends BatchKickOutSessionsResultDto {}

export class RbacExportPreviewDto {
  @ApiProperty()
  filename!: string;

  @ApiProperty({ required: false })
  contentType?: string;

  @ApiProperty({ required: false })
  contentBase64?: string;

  @ApiProperty({ example: 'current-page' })
  scope!: 'current-page';

  @ApiProperty({ type: [String] })
  columns!: readonly string[];

  @ApiProperty()
  rowCount!: number;

  @ApiProperty()
  generatedAt!: string;
}
