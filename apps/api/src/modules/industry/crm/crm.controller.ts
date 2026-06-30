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
@ApiTags('Industry CRM')
@Controller('industry/crm')
export class CrmController {
  constructor(private readonly repository: CrmRepository) {}

  @Get('summary')
  @RequirePermission('industry:crm:read')
  @ApiOkResponse({ type: CrmSummaryDto })
  getSummary(): Promise<CrmSummaryDto> {
    return this.repository.getSummary();
  }

  @Get('export')
  @RequirePermission('industry:crm:export')
  @ApiOkResponse({ type: CrmExportPreviewDto })
  exportCrm(@Query() query: CrmExportQueryDto): Promise<CrmExportPreviewDto> {
    return this.repository.exportCrm(query);
  }

  @Get('tags')
  @RequirePermission('industry:crm:read')
  @ApiOkResponse({ type: CrmTagPageDto })
  listTags(@Query() query: CrmTagQueryDto): Promise<CrmTagPageDto> {
    return this.repository.listTags(query);
  }

  @Post('tags')
  @RequirePermission('industry:crm:create')
  @AuditOperation({ action: 'create-tag', resource: 'industry.crm' })
  @ApiOkResponse({ type: CrmTagDto })
  createTag(@Body() body: CreateCrmTagDto): Promise<CrmTagDto> {
    return this.repository.createTag(body);
  }

  @Patch('tags/:id')
  @RequirePermission('industry:crm:update')
  @AuditOperation({
    action: 'update-tag',
    resource: 'industry.crm',
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
  @RequirePermission('industry:crm:read')
  @ApiOkResponse({ type: CrmLeadPageDto })
  listLeads(@Query() query: CrmLeadQueryDto): Promise<CrmLeadPageDto> {
    return this.repository.listLeads(query);
  }

  @Get('leads/:id')
  @RequirePermission('industry:crm:read')
  @ApiOkResponse({ type: CrmLeadDto })
  getLead(@Param('id') id: string): Promise<CrmLeadDto> {
    return this.repository.getLead(id);
  }

  @Post('leads')
  @RequirePermission('industry:crm:create')
  @AuditOperation({ action: 'create-lead', resource: 'industry.crm' })
  @ApiOkResponse({ type: CrmLeadDto })
  createLead(@Body() body: CreateCrmLeadDto): Promise<CrmLeadDto> {
    return this.repository.createLead(body);
  }

  @Patch('leads/:id')
  @RequirePermission('industry:crm:update')
  @AuditOperation({
    action: 'update-lead',
    resource: 'industry.crm',
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
  @RequirePermission('industry:crm:update')
  @AuditOperation({
    action: 'convert-lead',
    resource: 'industry.crm',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: ConvertCrmLeadResultDto })
  convertLead(@Param('id') id: string, @Body() body: ConvertCrmLeadDto) {
    return this.repository.convertLead(id, body);
  }

  @Patch('leads/:id/transfer')
  @RequirePermission('industry:crm:assign')
  @AuditOperation({
    action: 'transfer-lead',
    resource: 'industry.crm',
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
  @RequirePermission('industry:crm:delete')
  @AuditOperation({
    action: 'archive-lead',
    resource: 'industry.crm',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: CrmDeleteResultDto })
  archiveLead(@Param('id') id: string): Promise<{ deleted: true }> {
    return this.repository.archiveLead(id);
  }

  @Get('customers')
  @RequirePermission('industry:crm:read')
  @ApiOkResponse({ type: CrmCustomerPageDto })
  listCustomers(
    @Query() query: CrmCustomerQueryDto,
  ): Promise<CrmCustomerPageDto> {
    return this.repository.listCustomers(query);
  }

  @Get('customers/:id')
  @RequirePermission('industry:crm:read')
  @ApiOkResponse({ type: CrmCustomerDto })
  getCustomer(@Param('id') id: string): Promise<CrmCustomerDto> {
    return this.repository.getCustomer(id);
  }

  @Post('customers')
  @RequirePermission('industry:crm:create')
  @AuditOperation({ action: 'create-customer', resource: 'industry.crm' })
  @ApiOkResponse({ type: CrmCustomerDto })
  createCustomer(@Body() body: CreateCrmCustomerDto): Promise<CrmCustomerDto> {
    return this.repository.createCustomer(body);
  }

  @Patch('customers/:id')
  @RequirePermission('industry:crm:update')
  @AuditOperation({
    action: 'update-customer',
    resource: 'industry.crm',
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
  @RequirePermission('industry:crm:assign')
  @AuditOperation({
    action: 'transfer-customer',
    resource: 'industry.crm',
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
  @RequirePermission('industry:crm:delete')
  @AuditOperation({
    action: 'archive-customer',
    resource: 'industry.crm',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: CrmDeleteResultDto })
  archiveCustomer(@Param('id') id: string): Promise<{ deleted: true }> {
    return this.repository.archiveCustomer(id);
  }

  @Get('contacts')
  @RequirePermission('industry:crm:read')
  @ApiOkResponse({ type: CrmContactPageDto })
  listContacts(@Query() query: CrmContactQueryDto): Promise<CrmContactPageDto> {
    return this.repository.listContacts(query);
  }

  @Get('contacts/:id')
  @RequirePermission('industry:crm:read')
  @ApiOkResponse({ type: CrmContactDto })
  getContact(@Param('id') id: string): Promise<CrmContactDto> {
    return this.repository.getContact(id);
  }

  @Post('contacts')
  @RequirePermission('industry:crm:create')
  @AuditOperation({ action: 'create-contact', resource: 'industry.crm' })
  @ApiOkResponse({ type: CrmContactDto })
  createContact(@Body() body: CreateCrmContactDto): Promise<CrmContactDto> {
    return this.repository.createContact(body);
  }

  @Patch('contacts/:id')
  @RequirePermission('industry:crm:update')
  @AuditOperation({
    action: 'update-contact',
    resource: 'industry.crm',
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
  @RequirePermission('industry:crm:delete')
  @AuditOperation({
    action: 'archive-contact',
    resource: 'industry.crm',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: CrmDeleteResultDto })
  archiveContact(@Param('id') id: string): Promise<{ deleted: true }> {
    return this.repository.archiveContact(id);
  }

  @Get('opportunities')
  @RequirePermission('industry:crm:read')
  @ApiOkResponse({ type: CrmOpportunityPageDto })
  listOpportunities(
    @Query() query: CrmOpportunityQueryDto,
  ): Promise<CrmOpportunityPageDto> {
    return this.repository.listOpportunities(query);
  }

  @Get('opportunities/:id')
  @RequirePermission('industry:crm:read')
  @ApiOkResponse({ type: CrmOpportunityDto })
  getOpportunity(@Param('id') id: string): Promise<CrmOpportunityDto> {
    return this.repository.getOpportunity(id);
  }

  @Post('opportunities')
  @RequirePermission('industry:crm:create')
  @AuditOperation({ action: 'create-opportunity', resource: 'industry.crm' })
  @ApiOkResponse({ type: CrmOpportunityDto })
  createOpportunity(
    @Body() body: CreateCrmOpportunityDto,
  ): Promise<CrmOpportunityDto> {
    return this.repository.createOpportunity(body);
  }

  @Patch('opportunities/:id')
  @RequirePermission('industry:crm:update')
  @AuditOperation({
    action: 'update-opportunity',
    resource: 'industry.crm',
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
  @RequirePermission('industry:crm:update')
  @AuditOperation({
    action: 'change-opportunity-stage',
    resource: 'industry.crm',
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
  @RequirePermission('industry:crm:assign')
  @AuditOperation({
    action: 'transfer-opportunity',
    resource: 'industry.crm',
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
  @RequirePermission('industry:crm:delete')
  @AuditOperation({
    action: 'archive-opportunity',
    resource: 'industry.crm',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: CrmDeleteResultDto })
  archiveOpportunity(@Param('id') id: string): Promise<{ deleted: true }> {
    return this.repository.archiveOpportunity(id);
  }

  @Get('activity')
  @RequirePermission('industry:crm:read')
  @ApiOkResponse({ type: CrmActivityPageDto })
  listActivities(
    @Query() query: CrmTargetQueryDto,
  ): Promise<CrmActivityPageDto> {
    return this.repository.listActivities(query);
  }

  @Get('follow-ups')
  @RequirePermission('industry:crm:read')
  @ApiOkResponse({ type: CrmFollowUpPageDto })
  listFollowUps(
    @Query() query: CrmTargetQueryDto,
  ): Promise<CrmFollowUpPageDto> {
    return this.repository.listFollowUps(query);
  }

  @Post('follow-ups')
  @RequirePermission('industry:crm:comment')
  @AuditOperation({ action: 'create-follow-up', resource: 'industry.crm' })
  @ApiOkResponse({ type: CrmFollowUpDto })
  createFollowUp(@Body() body: CreateCrmFollowUpDto): Promise<CrmFollowUpDto> {
    return this.repository.createFollowUp(body);
  }

  @Get('tasks')
  @RequirePermission('industry:crm:read')
  @ApiOkResponse({ type: CrmTaskPageDto })
  listTasks(@Query() query: CrmTaskQueryDto): Promise<CrmTaskPageDto> {
    return this.repository.listTasks(query);
  }

  @Post('tasks')
  @RequirePermission('industry:crm:update')
  @AuditOperation({ action: 'create-task', resource: 'industry.crm' })
  @ApiOkResponse({ type: CrmTaskDto })
  createTask(@Body() body: CreateCrmTaskDto): Promise<CrmTaskDto> {
    return this.repository.createTask(body);
  }

  @Patch('tasks/:id/complete')
  @RequirePermission('industry:crm:update')
  @AuditOperation({
    action: 'complete-task',
    resource: 'industry.crm',
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
  @RequirePermission('industry:crm:read')
  @ApiOkResponse({ type: CrmAttachmentPageDto })
  listAttachments(
    @Query() query: CrmTargetQueryDto,
  ): Promise<CrmAttachmentPageDto> {
    return this.repository.listAttachments(query);
  }

  @Post('attachments')
  @RequirePermission('industry:crm:update')
  @AuditOperation({ action: 'create-attachment', resource: 'industry.crm' })
  @ApiOkResponse({ type: CrmAttachmentDto })
  createAttachment(
    @Body() body: CreateCrmAttachmentDto,
  ): Promise<CrmAttachmentDto> {
    return this.repository.createAttachment(body);
  }

  @Get('owner-transfers')
  @RequirePermission('industry:crm:read')
  @ApiOkResponse({ type: CrmOwnerTransferPageDto })
  listOwnerTransfers(
    @Query() query: CrmTargetQueryDto,
  ): Promise<CrmOwnerTransferPageDto> {
    return this.repository.listOwnerTransfers(query);
  }

  @Get('audit-events')
  @RequirePermission('industry:crm:read')
  @ApiOkResponse({ type: CrmAuditEventPageDto })
  listAuditEvents(
    @Query() query: CrmTargetQueryDto,
  ): Promise<CrmAuditEventPageDto> {
    return this.repository.listAuditEvents(query);
  }
}
