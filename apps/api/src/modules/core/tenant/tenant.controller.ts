import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
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
  TenantPlanDeleteResultDto,
  TenantPlanDto,
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

  @Get(':tenantId')
  @RequirePermission('platform:tenant:read')
  @ApiOkResponse({ type: TenantDto })
  getTenant(@Param('tenantId') tenantId: string): Promise<TenantDto> {
    return this.tenancy.getTenant(tenantId);
  }

  @Post()
  @RequirePermission('platform:tenant:create')
  @ApiCreatedResponse({ type: TenantDto })
  createTenant(@Body() body: CreateTenantDto): Promise<TenantDto> {
    return this.tenancy.createTenant(body);
  }

  @Patch(':tenantId')
  @RequirePermission('platform:tenant:update')
  @ApiOkResponse({ type: TenantDto })
  updateTenant(
    @Param('tenantId') tenantId: string,
    @Body() body: UpdateTenantDto,
  ): Promise<TenantDto> {
    return this.tenancy.updateTenant(tenantId, body);
  }

  @Patch(':tenantId/status')
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

  @Post(':tenantId/members')
  @RequirePermission('platform:tenant-member:manage')
  @ApiCreatedResponse({ type: TenantMemberDto })
  createTenantMember(
    @Param('tenantId') tenantId: string,
    @Body() body: CreateTenantMemberDto,
  ): Promise<TenantMemberDto> {
    return this.tenancy.createTenantMember(tenantId, body);
  }

  @Patch(':tenantId/members/:membershipId')
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

  @Get(':planId')
  @RequirePermission('platform:tenant-plan:read')
  @ApiOkResponse({ type: TenantPlanDto })
  getPlan(@Param('planId') planId: string): Promise<TenantPlanDto> {
    return this.tenancy.getTenantPlan(planId);
  }

  @Post()
  @RequirePermission('platform:tenant-plan:manage')
  @ApiCreatedResponse({ type: TenantPlanDto })
  createPlan(@Body() body: CreateTenantPlanDto): Promise<TenantPlanDto> {
    return this.tenancy.createTenantPlan(body);
  }

  @Patch(':planId')
  @RequirePermission('platform:tenant-plan:manage')
  @ApiOkResponse({ type: TenantPlanDto })
  updatePlan(
    @Param('planId') planId: string,
    @Body() body: UpdateTenantPlanDto,
  ): Promise<TenantPlanDto> {
    return this.tenancy.updateTenantPlan(planId, body);
  }

  @Delete(':planId')
  @RequirePermission('platform:tenant-plan:manage')
  @ApiOkResponse({ type: TenantPlanDeleteResultDto })
  deletePlan(
    @Param('planId') planId: string,
  ): Promise<TenantPlanDeleteResultDto> {
    return this.tenancy.deleteTenantPlan(planId);
  }
}
