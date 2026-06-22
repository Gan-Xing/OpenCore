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

  @ApiProperty({ required: false, example: 'root' })
  tenantCode?: string;

  @ApiProperty({ required: false, example: 'root.opencore.local' })
  tenantHost?: string;
}

export class SelectTenantRequestDto {
  @ApiProperty()
  loginTicket!: string;

  @ApiProperty({ required: false, example: 'tenant_root' })
  tenantId?: string;

  @ApiProperty({ required: false, example: 'root' })
  tenantCode?: string;

  @ApiProperty({ required: false })
  membershipId?: string;
}

export class SwitchTenantRequestDto {
  @ApiProperty({ required: false, example: 'tenant_root' })
  tenantId?: string;

  @ApiProperty({ required: false, example: 'root' })
  tenantCode?: string;

  @ApiProperty({ required: false })
  membershipId?: string;
}

export class AuthenticatedTenantDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  status!: string;
}

export class AuthenticatedMembershipDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  isOwner!: boolean;
}

export class TenantLoginOptionDto extends AuthenticatedTenantDto {
  @ApiProperty()
  membershipId!: string;

  @ApiProperty()
  membershipStatus!: string;

  @ApiProperty()
  isOwner!: boolean;
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

  @ApiProperty({ enum: ['platform', 'platform-visit', 'tenant'] })
  accessMode!: 'platform' | 'platform-visit' | 'tenant';

  @ApiProperty({ type: AuthenticatedTenantDto, required: false })
  activeTenant?: AuthenticatedTenantDto;

  @ApiProperty({ type: AuthenticatedMembershipDto, required: false })
  activeMembership?: AuthenticatedMembershipDto;

  @ApiProperty({ type: [String] })
  enabledModuleCodes!: readonly string[];

  @ApiProperty({ type: [TenantLoginOptionDto] })
  tenantOptions!: readonly TenantLoginOptionDto[];

  @ApiProperty({ required: false, nullable: true, type: String })
  avatarUrl?: string;
}

export class LoginResponseDto {
  @ApiProperty({ enum: ['authenticated'] })
  status!: 'authenticated';

  @ApiProperty()
  accessToken!: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType!: 'Bearer';

  @ApiProperty()
  expiresInSeconds!: number;

  @ApiProperty({ type: AuthenticatedUserDto })
  user!: AuthenticatedUserDto;
}

export class TenantSelectionLoginResponseDto {
  @ApiProperty({ enum: ['tenant_selection_required'] })
  status!: 'tenant_selection_required';

  @ApiProperty()
  loginTicket!: string;

  @ApiProperty({ type: [TenantLoginOptionDto] })
  tenantOptions!: readonly TenantLoginOptionDto[];
}

export class LoginResultDto {
  @ApiProperty({ enum: ['authenticated', 'tenant_selection_required'] })
  status!: 'authenticated' | 'tenant_selection_required';

  @ApiProperty({ required: false })
  accessToken?: string;

  @ApiProperty({ required: false, example: 'Bearer' })
  tokenType?: 'Bearer';

  @ApiProperty({ required: false })
  expiresInSeconds?: number;

  @ApiProperty({ type: AuthenticatedUserDto, required: false })
  user?: AuthenticatedUserDto;

  @ApiProperty({ required: false })
  loginTicket?: string;

  @ApiProperty({ type: [TenantLoginOptionDto], required: false })
  tenantOptions?: readonly TenantLoginOptionDto[];
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
