import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AuditOperation } from '@opencore/audit';
import { RequirePermission } from '../../core/rbac/permissions.decorator';
import {
  AssignBusinessPoolEntryDto,
  BusinessAssignmentEventPageDto,
  BusinessAssignmentEventQueryDto,
  BusinessDuplicateGroupPageDto,
  BusinessLifecycleCustomerDto,
  BusinessLifecycleCustomerPageDto,
  BusinessLifecycleCustomerQueryDto,
  BusinessLifecycleEventPageDto,
  BusinessLifecycleEventQueryDto,
  BusinessLifecycleExportPreviewDto,
  BusinessLifecycleExportQueryDto,
  BusinessLifecycleSummaryDto,
  BusinessLifecycleTimelinePageDto,
  BusinessPoolEntryDto,
  BusinessPoolEntryPageDto,
  BusinessPoolEntryQueryDto,
  ChangeBusinessLifecycleStageDto,
  ClaimBusinessPoolEntryDto,
  EnterBusinessPoolDto,
  RecycleBusinessPoolEntryDto,
} from './lifecycle.dto';
import { BusinessLifecycleRepository } from './lifecycle.repository';

@ApiBearerAuth()
@ApiTags('Business Lifecycle')
@Controller('business/lifecycle')
export class BusinessLifecycleController {
  constructor(private readonly repository: BusinessLifecycleRepository) {}

  @Get('summary')
  @RequirePermission('business:lifecycle:read')
  @ApiOkResponse({ type: BusinessLifecycleSummaryDto })
  getSummary(): Promise<BusinessLifecycleSummaryDto> {
    return this.repository.getSummary();
  }

  @Get('export')
  @RequirePermission('business:lifecycle:export')
  @ApiOkResponse({ type: BusinessLifecycleExportPreviewDto })
  exportLifecycle(
    @Query() query: BusinessLifecycleExportQueryDto,
  ): Promise<BusinessLifecycleExportPreviewDto> {
    return this.repository.exportLifecycle(query);
  }

  @Get('pool')
  @RequirePermission('business:lifecycle:read')
  @ApiOkResponse({ type: BusinessPoolEntryPageDto })
  listPoolEntries(
    @Query() query: BusinessPoolEntryQueryDto,
  ): Promise<BusinessPoolEntryPageDto> {
    return this.repository.listPoolEntries(query);
  }

  @Post('pool')
  @RequirePermission('business:lifecycle:create')
  @AuditOperation({ action: 'enter-pool', resource: 'business.lifecycle' })
  @ApiOkResponse({ type: BusinessPoolEntryDto })
  enterPool(@Body() body: EnterBusinessPoolDto): Promise<BusinessPoolEntryDto> {
    return this.repository.enterPool(body);
  }

  @Patch('pool/:id/claim')
  @RequirePermission('business:lifecycle:update')
  @AuditOperation({
    action: 'claim-pool-entry',
    resource: 'business.lifecycle',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: BusinessPoolEntryDto })
  claimPoolEntry(
    @Param('id') id: string,
    @Body() body: ClaimBusinessPoolEntryDto,
  ): Promise<BusinessPoolEntryDto> {
    return this.repository.claimPoolEntry(id, body);
  }

  @Patch('pool/:id/assign')
  @RequirePermission('business:lifecycle:assign')
  @AuditOperation({
    action: 'assign-pool-entry',
    resource: 'business.lifecycle',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: BusinessPoolEntryDto })
  assignPoolEntry(
    @Param('id') id: string,
    @Body() body: AssignBusinessPoolEntryDto,
  ): Promise<BusinessPoolEntryDto> {
    return this.repository.assignPoolEntry(id, body);
  }

  @Patch('pool/:id/transfer')
  @RequirePermission('business:lifecycle:assign')
  @AuditOperation({
    action: 'transfer-pool-entry',
    resource: 'business.lifecycle',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: BusinessPoolEntryDto })
  transferPoolEntry(
    @Param('id') id: string,
    @Body() body: AssignBusinessPoolEntryDto,
  ): Promise<BusinessPoolEntryDto> {
    return this.repository.transferPoolEntry(id, body);
  }

  @Patch('pool/:id/recycle')
  @RequirePermission('business:lifecycle:update')
  @AuditOperation({
    action: 'recycle-pool-entry',
    resource: 'business.lifecycle',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: BusinessPoolEntryDto })
  recyclePoolEntry(
    @Param('id') id: string,
    @Body() body: RecycleBusinessPoolEntryDto,
  ): Promise<BusinessPoolEntryDto> {
    return this.repository.recyclePoolEntry(id, body);
  }

  @Get('customers')
  @RequirePermission('business:lifecycle:read')
  @ApiOkResponse({ type: BusinessLifecycleCustomerPageDto })
  listCustomers(
    @Query() query: BusinessLifecycleCustomerQueryDto,
  ): Promise<BusinessLifecycleCustomerPageDto> {
    return this.repository.listCustomers(query);
  }

  @Patch('customers/:id/stage')
  @RequirePermission('business:lifecycle:update')
  @AuditOperation({
    action: 'change-customer-lifecycle-stage',
    resource: 'business.lifecycle',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: BusinessLifecycleCustomerDto })
  changeCustomerStage(
    @Param('id') id: string,
    @Body() body: ChangeBusinessLifecycleStageDto,
  ): Promise<BusinessLifecycleCustomerDto> {
    return this.repository.changeCustomerStage(id, body);
  }

  @Get('customers/:id/timeline')
  @RequirePermission('business:lifecycle:read')
  @ApiOkResponse({ type: BusinessLifecycleTimelinePageDto })
  listCustomerTimeline(
    @Param('id') id: string,
    @Query() query: BusinessLifecycleEventQueryDto,
  ): Promise<BusinessLifecycleTimelinePageDto> {
    return this.repository.listCustomerTimeline(id, query);
  }

  @Get('assignment-events')
  @RequirePermission('business:lifecycle:read')
  @ApiOkResponse({ type: BusinessAssignmentEventPageDto })
  listAssignmentEvents(
    @Query() query: BusinessAssignmentEventQueryDto,
  ): Promise<BusinessAssignmentEventPageDto> {
    return this.repository.listAssignmentEvents(query);
  }

  @Get('events')
  @RequirePermission('business:lifecycle:read')
  @ApiOkResponse({ type: BusinessLifecycleEventPageDto })
  listLifecycleEvents(
    @Query() query: BusinessLifecycleEventQueryDto,
  ): Promise<BusinessLifecycleEventPageDto> {
    return this.repository.listLifecycleEvents(query);
  }

  @Get('duplicates')
  @RequirePermission('business:lifecycle:read')
  @ApiOkResponse({ type: BusinessDuplicateGroupPageDto })
  listDuplicateGroups(
    @Query() query: BusinessPoolEntryQueryDto,
  ): Promise<BusinessDuplicateGroupPageDto> {
    return this.repository.listDuplicateGroups(query);
  }
}
