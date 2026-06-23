import { ApiProperty } from '@nestjs/swagger';

export class TenantPlanFoundationDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  enabled!: boolean;

  @ApiProperty({ type: Object })
  limits!: unknown;

  @ApiProperty({ type: [String] })
  moduleCodes!: readonly string[];

  @ApiProperty()
  tenantCount!: number;

  @ApiProperty({ required: false, nullable: true })
  remark?: string | null;
}

export class TenantPlanUsageTenantDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: ['active', 'expired', 'suspended'] })
  status!: string;
}

export class TenantPlanDto extends TenantPlanFoundationDto {
  @ApiProperty({ type: [TenantPlanUsageTenantDto] })
  tenants!: readonly TenantPlanUsageTenantDto[];

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class CreateTenantPlanDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ required: false, default: true })
  enabled?: boolean;

  @ApiProperty({ required: false, nullable: true })
  remark?: string | null;

  @ApiProperty({ required: false, type: Object })
  limits?: unknown;

  @ApiProperty({ required: false, type: [String] })
  moduleCodes?: readonly string[];
}

export class UpdateTenantPlanDto {
  @ApiProperty({ required: false })
  code?: string;

  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({ required: false })
  enabled?: boolean;

  @ApiProperty({ required: false, nullable: true })
  remark?: string | null;

  @ApiProperty({ required: false, type: Object })
  limits?: unknown;

  @ApiProperty({ required: false, type: [String] })
  moduleCodes?: readonly string[];
}

export class TenantPlanDeleteResultDto {
  @ApiProperty()
  deleted!: true;

  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;
}

export class TenantFoundationDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: ['active', 'expired', 'suspended'] })
  status!: string;

  @ApiProperty({ required: false, nullable: true })
  planCode?: string | null;

  @ApiProperty({ required: false, nullable: true })
  accountLimit?: number | null;

  @ApiProperty()
  membershipCount!: number;

  @ApiProperty()
  activeMembershipCount!: number;

  @ApiProperty({ type: [String] })
  ownerUsernames!: readonly string[];
}

export class TenantDto extends TenantFoundationDto {
  @ApiProperty({ required: false, nullable: true })
  planId?: string | null;

  @ApiProperty({ required: false, nullable: true })
  contactName?: string | null;

  @ApiProperty({ required: false, nullable: true })
  contactMobile?: string | null;

  @ApiProperty({ required: false, nullable: true })
  expiresAt?: string | null;

  @ApiProperty({ required: false, nullable: true })
  createdByUsername?: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class CreateTenantDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ required: false, nullable: true })
  planCode?: string | null;

  @ApiProperty({ required: false, enum: ['active', 'expired', 'suspended'] })
  status?: string;

  @ApiProperty({ required: false, nullable: true })
  contactName?: string | null;

  @ApiProperty({ required: false, nullable: true })
  contactMobile?: string | null;

  @ApiProperty({ required: false, nullable: true })
  accountLimit?: number | null;

  @ApiProperty({ required: false, nullable: true })
  expiresAt?: string | null;
}

export class UpdateTenantDto {
  @ApiProperty({ required: false })
  code?: string;

  @ApiProperty({ required: false })
  slug?: string;

  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({ required: false, nullable: true })
  planCode?: string | null;

  @ApiProperty({ required: false, nullable: true })
  contactName?: string | null;

  @ApiProperty({ required: false, nullable: true })
  contactMobile?: string | null;

  @ApiProperty({ required: false, nullable: true })
  accountLimit?: number | null;

  @ApiProperty({ required: false, nullable: true })
  expiresAt?: string | null;
}

export class SetTenantStatusDto {
  @ApiProperty({ enum: ['active', 'expired', 'suspended'] })
  status!: string;

  @ApiProperty({ required: false, nullable: true })
  expiresAt?: string | null;
}

export class PlatformRoleFoundationDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  enabled!: boolean;

  @ApiProperty()
  userCount!: number;

  @ApiProperty({ type: [String] })
  permissionCodes!: readonly string[];
}

export class TenantBackfillFoundationDto {
  @ApiProperty()
  userCount!: number;

  @ApiProperty()
  rootMembershipCount!: number;

  @ApiProperty()
  userRoleCount!: number;

  @ApiProperty()
  rootMembershipRoleCount!: number;

  @ApiProperty()
  userPostCount!: number;

  @ApiProperty()
  rootMembershipPostCount!: number;

  @ApiProperty({ type: [String] })
  missingRootMembershipUsernames!: readonly string[];
}

export class TenantRequestContextDto {
  @ApiProperty({ required: false })
  actorUserId?: string;

  @ApiProperty({ required: false })
  tenantId?: string;

  @ApiProperty({ required: false })
  membershipId?: string;

  @ApiProperty({
    required: false,
    enum: ['platform', 'platform-visit', 'tenant'],
  })
  accessMode?: string;
}

export class TenantFoundationSummaryDto {
  @ApiProperty({ enum: ['shared', 'single'] })
  tenancyMode!: 'shared' | 'single';

  @ApiProperty()
  rootTenantCode!: string;

  @ApiProperty({ type: [TenantFoundationDto] })
  tenants!: readonly TenantFoundationDto[];

  @ApiProperty({ type: [TenantPlanFoundationDto] })
  plans!: readonly TenantPlanFoundationDto[];

  @ApiProperty({ type: [PlatformRoleFoundationDto] })
  platformRoles!: readonly PlatformRoleFoundationDto[];

  @ApiProperty({ type: TenantBackfillFoundationDto })
  backfill!: TenantBackfillFoundationDto;

  @ApiProperty({ type: TenantRequestContextDto, required: false })
  requestContext?: TenantRequestContextDto;

  @ApiProperty()
  generatedAt!: string;
}

export class TenantMemberDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  username!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty({ enum: ['active', 'invited', 'left', 'suspended'] })
  status!: string;

  @ApiProperty()
  isOwner!: boolean;

  @ApiProperty({ required: false, nullable: true, type: String })
  deptId?: string | null;

  @ApiProperty({ required: false, nullable: true, type: String })
  deptName?: string | null;

  @ApiProperty({ type: [String] })
  roleCodes!: readonly string[];

  @ApiProperty({ type: [String] })
  postCodes!: readonly string[];

  @ApiProperty({ required: false, nullable: true })
  invitedByUsername?: string | null;

  @ApiProperty({ required: false, nullable: true })
  joinedAt?: string | null;

  @ApiProperty({ required: false, nullable: true })
  lastActiveAt?: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class CreateTenantMemberDto {
  @ApiProperty({ required: false })
  userId?: string;

  @ApiProperty({ required: false })
  username?: string;

  @ApiProperty({ required: false })
  displayName?: string;

  @ApiProperty({ required: false })
  password?: string;

  @ApiProperty({ required: false, nullable: true })
  mobile?: string | null;

  @ApiProperty({ required: false, nullable: true })
  email?: string | null;

  @ApiProperty({
    required: false,
    enum: ['active', 'invited', 'left', 'suspended'],
  })
  status?: string;

  @ApiProperty({ required: false })
  isOwner?: boolean;

  @ApiProperty({ required: false, nullable: true, type: String })
  deptId?: string | null;

  @ApiProperty({ required: false, type: [String] })
  roleCodes?: readonly string[];

  @ApiProperty({ required: false, type: [String] })
  postCodes?: readonly string[];
}

export class UpdateTenantMemberDto {
  @ApiProperty({
    required: false,
    enum: ['active', 'invited', 'left', 'suspended'],
  })
  status?: string;

  @ApiProperty({ required: false })
  isOwner?: boolean;

  @ApiProperty({ required: false, nullable: true, type: String })
  deptId?: string | null;

  @ApiProperty({ required: false, type: [String] })
  roleCodes?: readonly string[];

  @ApiProperty({ required: false, type: [String] })
  postCodes?: readonly string[];
}

export class TenantMemberDeleteResultDto {
  @ApiProperty()
  deleted!: true;

  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  username!: string;
}

export class UpdateTenantMemberAssignmentsDto {
  @ApiProperty({ required: false, nullable: true, type: String })
  deptId?: string | null;

  @ApiProperty({ required: false, enum: ['active', 'suspended'] })
  status?: string;

  @ApiProperty({ required: false, type: [String] })
  roleCodes?: readonly string[];

  @ApiProperty({ required: false, type: [String] })
  postCodes?: readonly string[];
}
