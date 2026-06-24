import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { AuditOperation } from '@opencore/audit';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../rbac/permissions.decorator';
import {
  TenantMemberDto,
  TenantMemberPageDto,
  TenantMemberQueryDto,
  UpdateTenantMemberAssignmentsDto,
} from './tenant.dto';
import { TenantFoundationService } from './tenant.service';

@ApiBearerAuth()
@ApiTags('Core Tenancy')
@Controller('core/tenancy/members')
export class TenantMemberController {
  constructor(private readonly service: TenantFoundationService) {}

  @Get()
  @RequirePermission('platform:tenant-member:read')
  @ApiOkResponse({ type: [TenantMemberDto] })
  listMembers(): Promise<TenantMemberDto[]> {
    return this.service.listMembers();
  }

  @Get('page')
  @RequirePermission('platform:tenant-member:read')
  @ApiOkResponse({ type: TenantMemberPageDto })
  listMembersPage(
    @Query() query: TenantMemberQueryDto,
  ): Promise<TenantMemberPageDto> {
    return this.service.listMembersPage(query);
  }

  @Patch(':membershipId/assignments')
  @AuditOperation({
    action: 'update-assignments',
    resource: 'core.tenancy.tenant-member',
    resourceIdField: 'membershipId',
  })
  @RequirePermission('platform:tenant-member:manage')
  @ApiOkResponse({ type: TenantMemberDto })
  updateMemberAssignments(
    @Param('membershipId') membershipId: string,
    @Body() body: UpdateTenantMemberAssignmentsDto,
  ): Promise<TenantMemberDto> {
    return this.service.updateMemberAssignments(membershipId, body);
  }
}
