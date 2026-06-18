import { ApiProperty } from '@nestjs/swagger';

export class UserSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  username!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty({ required: false, nullable: true, type: String })
  mobile?: string;

  @ApiProperty({ required: false, nullable: true, type: String })
  email?: string;

  @ApiProperty({ required: false, nullable: true, type: String })
  gender?: string;

  @ApiProperty({ type: [String] })
  roleCodes!: readonly string[];

  @ApiProperty({ type: [String] })
  roleNames!: readonly string[];

  @ApiProperty({ required: false, nullable: true, type: String })
  deptId?: string;

  @ApiProperty({ required: false, nullable: true, type: String })
  deptName?: string;

  @ApiProperty({ type: [String] })
  postCodes!: readonly string[];

  @ApiProperty({ type: [String] })
  postNames!: readonly string[];

  @ApiProperty({ required: false, nullable: true, type: String })
  avatarUrl?: string;

  @ApiProperty({ required: false, nullable: true, type: String })
  avatarMimeType?: string;

  @ApiProperty({ required: false, nullable: true, type: Number })
  avatarSizeBytes?: number;

  @ApiProperty({ required: false, nullable: true, type: String })
  avatarUpdatedAt?: string;

  @ApiProperty()
  enabled!: boolean;

  @ApiProperty()
  system!: boolean;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class UserOptionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  username!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty({ required: false, nullable: true, type: String })
  deptId?: string;

  @ApiProperty({ type: [String] })
  postCodes!: readonly string[];
}

export class ListUsersQueryDto {
  @ApiProperty({ required: false })
  deptId?: string;
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

  @ApiProperty({ required: false, nullable: true, type: String })
  deptId?: string | null;

  @ApiProperty({ required: false, type: [String], default: [] })
  postCodes?: readonly string[];

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

  @ApiProperty({ required: false, nullable: true, type: String })
  deptId?: string | null;

  @ApiProperty({ required: false, type: [String] })
  postCodes?: readonly string[];

  @ApiProperty({ required: false })
  enabled?: boolean;
}

export class UserRoleAssignmentDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty()
  username!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty({ type: [String] })
  roleCodes!: readonly string[];

  @ApiProperty({ required: false })
  revokedSessionCount?: number;
}

export class AssignUserRolesDto {
  @ApiProperty({ type: [String] })
  roleCodes!: readonly string[];
}

export class UserProfileDto extends UserSummaryDto {}

export class UpdateUserProfileDto {
  @ApiProperty({ required: false })
  displayName?: string;

  @ApiProperty({ required: false })
  mobile?: string;

  @ApiProperty({ required: false })
  email?: string;

  @ApiProperty({ required: false })
  gender?: string;
}

export class UploadUserAvatarDto {
  @ApiProperty({ format: 'binary', type: 'string' })
  file!: unknown;
}

export class UpdateUserPasswordDto {
  @ApiProperty()
  oldPassword!: string;

  @ApiProperty()
  newPassword!: string;
}

export class SetUserStatusDto {
  @ApiProperty()
  enabled!: boolean;
}

export class BatchSetUserStatusDto extends SetUserStatusDto {
  @ApiProperty({ type: [String] })
  userIds!: readonly string[];
}

export class BatchDeleteUsersDto {
  @ApiProperty({ type: [String] })
  userIds!: readonly string[];
}

export class UserImportTemplateDto {
  @ApiProperty()
  filename!: string;

  @ApiProperty()
  contentType!: string;

  @ApiProperty()
  contentBase64!: string;

  @ApiProperty({ type: [String] })
  columns!: readonly string[];

  @ApiProperty()
  rowCount!: number;
}

export class ImportUsersDto {
  @ApiProperty({ description: 'Base64-encoded CSV or XLSX content.' })
  contentBase64!: string;

  @ApiProperty({ required: false, default: false })
  updateExisting?: boolean;
}

export class UserImportFailureDto {
  @ApiProperty()
  rowNumber!: number;

  @ApiProperty({ required: false })
  username?: string;

  @ApiProperty()
  reason!: string;
}

export class UserImportResultDto {
  @ApiProperty()
  totalRows!: number;

  @ApiProperty()
  created!: number;

  @ApiProperty()
  updated!: number;

  @ApiProperty()
  failed!: number;

  @ApiProperty({ type: [String] })
  createdUsernames!: readonly string[];

  @ApiProperty({ type: [String] })
  updatedUsernames!: readonly string[];

  @ApiProperty({ type: [UserImportFailureDto] })
  failures!: readonly UserImportFailureDto[];

  @ApiProperty({ required: false })
  revokedSessionCount?: number;
}

export class ResetUserPasswordDto {
  @ApiProperty()
  password!: string;
}

export class UserMutationResultDto extends UserSummaryDto {
  @ApiProperty({ required: false })
  revokedSessionCount?: number;
}

export class BatchUserMutationResultDto {
  @ApiProperty()
  affected!: number;

  @ApiProperty({ type: [String] })
  userIds!: readonly string[];

  @ApiProperty({ required: false })
  enabled?: boolean;

  @ApiProperty({ required: false })
  deleted?: true;

  @ApiProperty({ required: false })
  revokedSessionCount?: number;
}

export class AssignRoleUsersDto {
  @ApiProperty({ type: [String] })
  userIds!: readonly string[];
}

export class RoleUserAssignmentDto {
  @ApiProperty()
  roleCode!: string;

  @ApiProperty({ type: [String] })
  assignedUserIds!: readonly string[];

  @ApiProperty({ type: [UserSummaryDto] })
  assignedUsers!: readonly UserSummaryDto[];

  @ApiProperty({ type: [UserSummaryDto] })
  availableUsers!: readonly UserSummaryDto[];

  @ApiProperty({ required: false })
  revokedSessionCount?: number;
}
