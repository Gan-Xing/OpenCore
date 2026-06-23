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

  @ApiProperty({ enum: ['active', 'suspended'] })
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

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
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
