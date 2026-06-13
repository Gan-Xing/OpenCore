import { ApiProperty } from '@nestjs/swagger';

export class UserSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  username!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty({ type: [String] })
  roleCodes!: readonly string[];

  @ApiProperty({ required: false, nullable: true, type: String })
  deptId?: string;

  @ApiProperty({ type: [String] })
  postCodes!: readonly string[];

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

export class UserProfileDto extends UserSummaryDto {}

export class UpdateUserProfileDto {
  @ApiProperty({ required: false })
  displayName?: string;
}

export class UploadUserAvatarDto {
  @ApiProperty({ example: 'avatar.png' })
  originalName!: string;

  @ApiProperty({ example: 'image/png' })
  mimeType!: string;

  @ApiProperty({ description: 'Base64-encoded image bytes.' })
  contentBase64!: string;
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
