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
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { AuditOperation } from '@opencore/audit';
import { RequirePermission } from '../../core/rbac/permissions.decorator';
import {
  ChangeCrmOpportunityStageDto,
  CompleteCrmTaskDto,
  ConvertCrmLeadDto,
  ConvertCrmLeadResultDto,
  CreateCrmAttachmentDto,
  CreateCrmContactDto,
  CreateCrmCustomerDto,
  CreateCrmFollowUpDto,
  CreateCrmLeadDto,
  CreateCrmOpportunityDto,
  CreateCrmTagDto,
  CreateCrmTaskDto,
  CrmAttachmentDto,
  CrmAttachmentPageDto,
  CrmAuditEventPageDto,
  CrmContactDto,
  CrmContactPageDto,
  CrmContactQueryDto,
  CrmCustomerDto,
  CrmCustomerPageDto,
  CrmCustomerQueryDto,
  CrmExportPreviewDto,
  CrmExportQueryDto,
  CrmFollowUpDto,
  CrmFollowUpPageDto,
  CrmLeadDto,
  CrmLeadPageDto,
  CrmLeadQueryDto,
  CrmOpportunityDto,
  CrmOpportunityPageDto,
  CrmOpportunityQueryDto,
  CrmOwnerTransferPageDto,
  CrmSummaryDto,
  CrmTagDto,
  CrmTagPageDto,
  CrmTagQueryDto,
  CrmTargetQueryDto,
  CrmTaskDto,
  CrmTaskPageDto,
  CrmTaskQueryDto,
  TransferCrmOwnerDto,
  UpdateCrmContactDto,
  UpdateCrmCustomerDto,
  UpdateCrmLeadDto,
  UpdateCrmOpportunityDto,
  UpdateCrmTagDto,
  CrmActivityPageDto,
} from './crm.dto';
import { CrmRepository } from './crm.repository';

class CrmDeleteResultDto {
  @ApiProperty()
  deleted!: true;
}

@ApiBearerAuth()
@ApiTags('Business Core')
@Controller('business/core')
export class CrmController {
  constructor(private readonly repository: CrmRepository) {}

  @Get('summary')
  @RequirePermission('business:core:read')
  @ApiOkResponse({ type: CrmSummaryDto })
  getSummary(): Promise<CrmSummaryDto> {
    return this.repository.getSummary();
  }

  @Get('export')
  @RequirePermission('business:core:export')
  @ApiOkResponse({ type: CrmExportPreviewDto })
  exportCrm(@Query() query: CrmExportQueryDto): Promise<CrmExportPreviewDto> {
    return this.repository.exportCrm(query);
  }

  @Get('tags')
  @RequirePermission('business:core:read')
  @ApiOkResponse({ type: CrmTagPageDto })
  listTags(@Query() query: CrmTagQueryDto): Promise<CrmTagPageDto> {
    return this.repository.listTags(query);
  }

  @Post('tags')
  @RequirePermission('business:core:create')
  @AuditOperation({ action: 'create-tag', resource: 'business.core' })
  @ApiOkResponse({ type: CrmTagDto })
  createTag(@Body() body: CreateCrmTagDto): Promise<CrmTagDto> {
    return this.repository.createTag(body);
  }

  @Patch('tags/:id')
  @RequirePermission('business:core:update')
  @AuditOperation({
    action: 'update-tag',
    resource: 'business.core',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: CrmTagDto })
  updateTag(
    @Param('id') id: string,
    @Body() body: UpdateCrmTagDto,
  ): Promise<CrmTagDto> {
    return this.repository.updateTag(id, body);
  }

  @Get('leads')
  @RequirePermission('business:core:read')
  @ApiOkResponse({ type: CrmLeadPageDto })
  listLeads(@Query() query: CrmLeadQueryDto): Promise<CrmLeadPageDto> {
    return this.repository.listLeads(query);
  }

  @Get('leads/:id')
  @RequirePermission('business:core:read')
  @ApiOkResponse({ type: CrmLeadDto })
  getLead(@Param('id') id: string): Promise<CrmLeadDto> {
    return this.repository.getLead(id);
  }

  @Post('leads')
  @RequirePermission('business:core:create')
  @AuditOperation({ action: 'create-lead', resource: 'business.core' })
  @ApiOkResponse({ type: CrmLeadDto })
  createLead(@Body() body: CreateCrmLeadDto): Promise<CrmLeadDto> {
    return this.repository.createLead(body);
  }

  @Patch('leads/:id')
  @RequirePermission('business:core:update')
  @AuditOperation({
    action: 'update-lead',
    resource: 'business.core',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: CrmLeadDto })
  updateLead(
    @Param('id') id: string,
    @Body() body: UpdateCrmLeadDto,
  ): Promise<CrmLeadDto> {
    return this.repository.updateLead(id, body);
  }

  @Patch('leads/:id/convert')
  @RequirePermission('business:core:update')
  @AuditOperation({
    action: 'convert-lead',
    resource: 'business.core',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: ConvertCrmLeadResultDto })
  convertLead(@Param('id') id: string, @Body() body: ConvertCrmLeadDto) {
    return this.repository.convertLead(id, body);
  }

  @Patch('leads/:id/transfer')
  @RequirePermission('business:core:assign')
  @AuditOperation({
    action: 'transfer-lead',
    resource: 'business.core',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: CrmLeadDto })
  transferLeadOwner(
    @Param('id') id: string,
    @Body() body: TransferCrmOwnerDto,
  ): Promise<CrmLeadDto> {
    return this.repository.transferLeadOwner(id, body);
  }

  @Delete('leads/:id')
  @RequirePermission('business:core:delete')
  @AuditOperation({
    action: 'archive-lead',
    resource: 'business.core',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: CrmDeleteResultDto })
  archiveLead(@Param('id') id: string): Promise<{ deleted: true }> {
    return this.repository.archiveLead(id);
  }

  @Get('customers')
  @RequirePermission('business:core:read')
  @ApiOkResponse({ type: CrmCustomerPageDto })
  listCustomers(
    @Query() query: CrmCustomerQueryDto,
  ): Promise<CrmCustomerPageDto> {
    return this.repository.listCustomers(query);
  }

  @Get('customers/:id')
  @RequirePermission('business:core:read')
  @ApiOkResponse({ type: CrmCustomerDto })
  getCustomer(@Param('id') id: string): Promise<CrmCustomerDto> {
    return this.repository.getCustomer(id);
  }

  @Post('customers')
  @RequirePermission('business:core:create')
  @AuditOperation({ action: 'create-customer', resource: 'business.core' })
  @ApiOkResponse({ type: CrmCustomerDto })
  createCustomer(@Body() body: CreateCrmCustomerDto): Promise<CrmCustomerDto> {
    return this.repository.createCustomer(body);
  }

  @Patch('customers/:id')
  @RequirePermission('business:core:update')
  @AuditOperation({
    action: 'update-customer',
    resource: 'business.core',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: CrmCustomerDto })
  updateCustomer(
    @Param('id') id: string,
    @Body() body: UpdateCrmCustomerDto,
  ): Promise<CrmCustomerDto> {
    return this.repository.updateCustomer(id, body);
  }

  @Patch('customers/:id/transfer')
  @RequirePermission('business:core:assign')
  @AuditOperation({
    action: 'transfer-customer',
    resource: 'business.core',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: CrmCustomerDto })
  transferCustomerOwner(
    @Param('id') id: string,
    @Body() body: TransferCrmOwnerDto,
  ): Promise<CrmCustomerDto> {
    return this.repository.transferCustomerOwner(id, body);
  }

  @Delete('customers/:id')
  @RequirePermission('business:core:delete')
  @AuditOperation({
    action: 'archive-customer',
    resource: 'business.core',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: CrmDeleteResultDto })
  archiveCustomer(@Param('id') id: string): Promise<{ deleted: true }> {
    return this.repository.archiveCustomer(id);
  }

  @Get('contacts')
  @RequirePermission('business:core:read')
  @ApiOkResponse({ type: CrmContactPageDto })
  listContacts(@Query() query: CrmContactQueryDto): Promise<CrmContactPageDto> {
    return this.repository.listContacts(query);
  }

  @Get('contacts/:id')
  @RequirePermission('business:core:read')
  @ApiOkResponse({ type: CrmContactDto })
  getContact(@Param('id') id: string): Promise<CrmContactDto> {
    return this.repository.getContact(id);
  }

  @Post('contacts')
  @RequirePermission('business:core:create')
  @AuditOperation({ action: 'create-contact', resource: 'business.core' })
  @ApiOkResponse({ type: CrmContactDto })
  createContact(@Body() body: CreateCrmContactDto): Promise<CrmContactDto> {
    return this.repository.createContact(body);
  }

  @Patch('contacts/:id')
  @RequirePermission('business:core:update')
  @AuditOperation({
    action: 'update-contact',
    resource: 'business.core',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: CrmContactDto })
  updateContact(
    @Param('id') id: string,
    @Body() body: UpdateCrmContactDto,
  ): Promise<CrmContactDto> {
    return this.repository.updateContact(id, body);
  }

  @Delete('contacts/:id')
  @RequirePermission('business:core:delete')
  @AuditOperation({
    action: 'archive-contact',
    resource: 'business.core',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: CrmDeleteResultDto })
  archiveContact(@Param('id') id: string): Promise<{ deleted: true }> {
    return this.repository.archiveContact(id);
  }

  @Get('opportunities')
  @RequirePermission('business:core:read')
  @ApiOkResponse({ type: CrmOpportunityPageDto })
  listOpportunities(
    @Query() query: CrmOpportunityQueryDto,
  ): Promise<CrmOpportunityPageDto> {
    return this.repository.listOpportunities(query);
  }

  @Get('opportunities/:id')
  @RequirePermission('business:core:read')
  @ApiOkResponse({ type: CrmOpportunityDto })
  getOpportunity(@Param('id') id: string): Promise<CrmOpportunityDto> {
    return this.repository.getOpportunity(id);
  }

  @Post('opportunities')
  @RequirePermission('business:core:create')
  @AuditOperation({ action: 'create-opportunity', resource: 'business.core' })
  @ApiOkResponse({ type: CrmOpportunityDto })
  createOpportunity(
    @Body() body: CreateCrmOpportunityDto,
  ): Promise<CrmOpportunityDto> {
    return this.repository.createOpportunity(body);
  }

  @Patch('opportunities/:id')
  @RequirePermission('business:core:update')
  @AuditOperation({
    action: 'update-opportunity',
    resource: 'business.core',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: CrmOpportunityDto })
  updateOpportunity(
    @Param('id') id: string,
    @Body() body: UpdateCrmOpportunityDto,
  ): Promise<CrmOpportunityDto> {
    return this.repository.updateOpportunity(id, body);
  }

  @Patch('opportunities/:id/stage')
  @RequirePermission('business:core:update')
  @AuditOperation({
    action: 'change-opportunity-stage',
    resource: 'business.core',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: CrmOpportunityDto })
  changeOpportunityStage(
    @Param('id') id: string,
    @Body() body: ChangeCrmOpportunityStageDto,
  ): Promise<CrmOpportunityDto> {
    return this.repository.changeOpportunityStage(id, body);
  }

  @Patch('opportunities/:id/transfer')
  @RequirePermission('business:core:assign')
  @AuditOperation({
    action: 'transfer-opportunity',
    resource: 'business.core',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: CrmOpportunityDto })
  transferOpportunityOwner(
    @Param('id') id: string,
    @Body() body: TransferCrmOwnerDto,
  ): Promise<CrmOpportunityDto> {
    return this.repository.transferOpportunityOwner(id, body);
  }

  @Delete('opportunities/:id')
  @RequirePermission('business:core:delete')
  @AuditOperation({
    action: 'archive-opportunity',
    resource: 'business.core',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: CrmDeleteResultDto })
  archiveOpportunity(@Param('id') id: string): Promise<{ deleted: true }> {
    return this.repository.archiveOpportunity(id);
  }

  @Get('activity')
  @RequirePermission('business:core:read')
  @ApiOkResponse({ type: CrmActivityPageDto })
  listActivities(
    @Query() query: CrmTargetQueryDto,
  ): Promise<CrmActivityPageDto> {
    return this.repository.listActivities(query);
  }

  @Get('follow-ups')
  @RequirePermission('business:core:read')
  @ApiOkResponse({ type: CrmFollowUpPageDto })
  listFollowUps(
    @Query() query: CrmTargetQueryDto,
  ): Promise<CrmFollowUpPageDto> {
    return this.repository.listFollowUps(query);
  }

  @Post('follow-ups')
  @RequirePermission('business:core:comment')
  @AuditOperation({ action: 'create-follow-up', resource: 'business.core' })
  @ApiOkResponse({ type: CrmFollowUpDto })
  createFollowUp(@Body() body: CreateCrmFollowUpDto): Promise<CrmFollowUpDto> {
    return this.repository.createFollowUp(body);
  }

  @Get('tasks')
  @RequirePermission('business:core:read')
  @ApiOkResponse({ type: CrmTaskPageDto })
  listTasks(@Query() query: CrmTaskQueryDto): Promise<CrmTaskPageDto> {
    return this.repository.listTasks(query);
  }

  @Post('tasks')
  @RequirePermission('business:core:update')
  @AuditOperation({ action: 'create-task', resource: 'business.core' })
  @ApiOkResponse({ type: CrmTaskDto })
  createTask(@Body() body: CreateCrmTaskDto): Promise<CrmTaskDto> {
    return this.repository.createTask(body);
  }

  @Patch('tasks/:id/complete')
  @RequirePermission('business:core:update')
  @AuditOperation({
    action: 'complete-task',
    resource: 'business.core',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: CrmTaskDto })
  completeTask(
    @Param('id') id: string,
    @Body() body: CompleteCrmTaskDto,
  ): Promise<CrmTaskDto> {
    return this.repository.completeTask(id, body);
  }

  @Get('attachments')
  @RequirePermission('business:core:read')
  @ApiOkResponse({ type: CrmAttachmentPageDto })
  listAttachments(
    @Query() query: CrmTargetQueryDto,
  ): Promise<CrmAttachmentPageDto> {
    return this.repository.listAttachments(query);
  }

  @Post('attachments')
  @RequirePermission('business:core:update')
  @AuditOperation({ action: 'create-attachment', resource: 'business.core' })
  @ApiOkResponse({ type: CrmAttachmentDto })
  createAttachment(
    @Body() body: CreateCrmAttachmentDto,
  ): Promise<CrmAttachmentDto> {
    return this.repository.createAttachment(body);
  }

  @Get('owner-transfers')
  @RequirePermission('business:core:read')
  @ApiOkResponse({ type: CrmOwnerTransferPageDto })
  listOwnerTransfers(
    @Query() query: CrmTargetQueryDto,
  ): Promise<CrmOwnerTransferPageDto> {
    return this.repository.listOwnerTransfers(query);
  }

  @Get('audit-events')
  @RequirePermission('business:core:read')
  @ApiOkResponse({ type: CrmAuditEventPageDto })
  listAuditEvents(
    @Query() query: CrmTargetQueryDto,
  ): Promise<CrmAuditEventPageDto> {
    return this.repository.listAuditEvents(query);
  }
}
