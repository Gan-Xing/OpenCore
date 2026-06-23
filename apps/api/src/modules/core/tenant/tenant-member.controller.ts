import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../rbac/permissions.decorator';
import {
  TenantMemberDto,
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

  @Patch(':membershipId/assignments')
  @RequirePermission('platform:tenant-member:manage')
  @ApiOkResponse({ type: TenantMemberDto })
  updateMemberAssignments(
    @Param('membershipId') membershipId: string,
    @Body() body: UpdateTenantMemberAssignmentsDto,
  ): Promise<TenantMemberDto> {
    return this.service.updateMemberAssignments(membershipId, body);
  }
}
