import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AuditOperation } from '@opencore/audit';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermission } from '../rbac/permissions.decorator';
import {
  CreateTenantMemberDto,
  CreateTenantPlanDto,
  CreateTenantDto,
  SetTenantStatusDto,
  TenantFoundationSummaryDto,
  TenantMemberDeleteResultDto,
  TenantMemberDto,
  TenantMemberPageDto,
  TenantMemberQueryDto,
  TenantPlanDeleteResultDto,
  TenantPlanDto,
  TenantPlanPageDto,
  TenantPlanQueryDto,
  TenantPageDto,
  TenantQueryDto,
  TenantDto,
  UpdateTenantMemberDto,
  UpdateTenantPlanDto,
  UpdateTenantDto,
} from './tenant.dto';
import { TenantFoundationService } from './tenant.service';

@ApiBearerAuth()
@ApiTags('Core Tenancy')
@Controller('core/tenancy')
export class TenantFoundationController {
  constructor(private readonly tenancy: TenantFoundationService) {}

  @Get('foundation')
  @RequirePermission('platform:tenant:read')
  @ApiOkResponse({ type: TenantFoundationSummaryDto })
  getFoundationSummary(): Promise<TenantFoundationSummaryDto> {
    return this.tenancy.getFoundationSummary();
  }
}

@ApiBearerAuth()
@ApiTags('Core Tenancy')
@Controller('core/tenancy/tenants')
export class TenantController {
  constructor(private readonly tenancy: TenantFoundationService) {}

  @Get()
  @RequirePermission('platform:tenant:read')
  @ApiOkResponse({ type: [TenantDto] })
  listTenants(): Promise<TenantDto[]> {
    return this.tenancy.listTenants();
  }

  @Get('page')
  @RequirePermission('platform:tenant:read')
  @ApiOkResponse({ type: TenantPageDto })
  listTenantsPage(@Query() query: TenantQueryDto): Promise<TenantPageDto> {
    return this.tenancy.listTenantsPage(query);
  }

  @Get(':tenantId')
  @RequirePermission('platform:tenant:read')
  @ApiOkResponse({ type: TenantDto })
  getTenant(@Param('tenantId') tenantId: string): Promise<TenantDto> {
    return this.tenancy.getTenant(tenantId);
  }

  @Post()
  @AuditOperation({
    action: 'create',
    resource: 'core.tenancy.tenant',
  })
  @RequirePermission('platform:tenant:create')
  @ApiCreatedResponse({ type: TenantDto })
  createTenant(@Body() body: CreateTenantDto): Promise<TenantDto> {
    return this.tenancy.createTenant(body);
  }

  @Patch(':tenantId')
  @AuditOperation({
    action: 'update',
    resource: 'core.tenancy.tenant',
    resourceIdField: 'tenantId',
  })
  @RequirePermission('platform:tenant:update')
  @ApiOkResponse({ type: TenantDto })
  updateTenant(
    @Param('tenantId') tenantId: string,
    @Body() body: UpdateTenantDto,
  ): Promise<TenantDto> {
    return this.tenancy.updateTenant(tenantId, body);
  }

  @Patch(':tenantId/status')
  @AuditOperation({
    action: 'set-status',
    resource: 'core.tenancy.tenant',
    resourceIdField: 'tenantId',
  })
  @RequirePermission('platform:tenant:suspend')
  @ApiOkResponse({ type: TenantDto })
  setTenantStatus(
    @Param('tenantId') tenantId: string,
    @Body() body: SetTenantStatusDto,
  ): Promise<TenantDto> {
    return this.tenancy.setTenantStatus(tenantId, body);
  }

  @Get(':tenantId/members')
  @RequirePermission('platform:tenant-member:read')
  @ApiOkResponse({ type: [TenantMemberDto] })
  listTenantMembers(
    @Param('tenantId') tenantId: string,
  ): Promise<TenantMemberDto[]> {
    return this.tenancy.listTenantMembers(tenantId);
  }

  @Get(':tenantId/members/page')
  @RequirePermission('platform:tenant-member:read')
  @ApiOkResponse({ type: TenantMemberPageDto })
  listTenantMembersPage(
    @Param('tenantId') tenantId: string,
    @Query() query: TenantMemberQueryDto,
  ): Promise<TenantMemberPageDto> {
    return this.tenancy.listTenantMembersPage(tenantId, query);
  }

  @Post(':tenantId/members')
  @AuditOperation({
    action: 'create',
    resource: 'core.tenancy.tenant-member',
    resourceIdField: 'tenantId',
  })
  @RequirePermission('platform:tenant-member:manage')
  @ApiCreatedResponse({ type: TenantMemberDto })
  createTenantMember(
    @Param('tenantId') tenantId: string,
    @Body() body: CreateTenantMemberDto,
  ): Promise<TenantMemberDto> {
    return this.tenancy.createTenantMember(tenantId, body);
  }

  @Patch(':tenantId/members/:membershipId')
  @AuditOperation({
    action: 'update',
    resource: 'core.tenancy.tenant-member',
    resourceIdField: 'membershipId',
  })
  @RequirePermission('platform:tenant-member:manage')
  @ApiOkResponse({ type: TenantMemberDto })
  updateTenantMember(
    @Param('tenantId') tenantId: string,
    @Param('membershipId') membershipId: string,
    @Body() body: UpdateTenantMemberDto,
  ): Promise<TenantMemberDto> {
    return this.tenancy.updateTenantMember(tenantId, membershipId, body);
  }

  @Delete(':tenantId/members/:membershipId')
  @AuditOperation({
    action: 'remove',
    resource: 'core.tenancy.tenant-member',
    resourceIdField: 'membershipId',
  })
  @RequirePermission('platform:tenant-member:manage')
  @ApiOkResponse({ type: TenantMemberDeleteResultDto })
  removeTenantMember(
    @Param('tenantId') tenantId: string,
    @Param('membershipId') membershipId: string,
  ): Promise<TenantMemberDeleteResultDto> {
    return this.tenancy.removeTenantMember(tenantId, membershipId);
  }
}

@ApiBearerAuth()
@ApiTags('Core Tenancy')
@Controller('core/tenancy/plans')
export class TenantPlanController {
  constructor(private readonly tenancy: TenantFoundationService) {}

  @Get()
  @RequirePermission('platform:tenant-plan:read')
  @ApiOkResponse({ type: [TenantPlanDto] })
  listPlans(): Promise<TenantPlanDto[]> {
    return this.tenancy.listTenantPlans();
  }

  @Get('page')
  @RequirePermission('platform:tenant-plan:read')
  @ApiOkResponse({ type: TenantPlanPageDto })
  listPlansPage(
    @Query() query: TenantPlanQueryDto,
  ): Promise<TenantPlanPageDto> {
    return this.tenancy.listTenantPlansPage(query);
  }

  @Get(':planId')
  @RequirePermission('platform:tenant-plan:read')
  @ApiOkResponse({ type: TenantPlanDto })
  getPlan(@Param('planId') planId: string): Promise<TenantPlanDto> {
    return this.tenancy.getTenantPlan(planId);
  }

  @Post()
  @AuditOperation({
    action: 'create',
    resource: 'core.tenancy.tenant-plan',
  })
  @RequirePermission('platform:tenant-plan:manage')
  @ApiCreatedResponse({ type: TenantPlanDto })
  createPlan(@Body() body: CreateTenantPlanDto): Promise<TenantPlanDto> {
    return this.tenancy.createTenantPlan(body);
  }

  @Patch(':planId')
  @AuditOperation({
    action: 'update',
    resource: 'core.tenancy.tenant-plan',
    resourceIdField: 'planId',
  })
  @RequirePermission('platform:tenant-plan:manage')
  @ApiOkResponse({ type: TenantPlanDto })
  updatePlan(
    @Param('planId') planId: string,
    @Body() body: UpdateTenantPlanDto,
  ): Promise<TenantPlanDto> {
    return this.tenancy.updateTenantPlan(planId, body);
  }

  @Delete(':planId')
  @AuditOperation({
    action: 'delete',
    resource: 'core.tenancy.tenant-plan',
    resourceIdField: 'planId',
  })
  @RequirePermission('platform:tenant-plan:manage')
  @ApiOkResponse({ type: TenantPlanDeleteResultDto })
  deletePlan(
    @Param('planId') planId: string,
  ): Promise<TenantPlanDeleteResultDto> {
    return this.tenancy.deleteTenantPlan(planId);
  }
}
