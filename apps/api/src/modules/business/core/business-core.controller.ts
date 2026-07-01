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
  CompleteBusinessTaskDto,
  CreateBusinessAttachmentDto,
  CreateBusinessContactDto,
  CreateBusinessCustomerDto,
  CreateBusinessFollowUpDto,
  CreateBusinessTagDto,
  CreateBusinessTaskDto,
  BusinessAttachmentDto,
  BusinessAttachmentPageDto,
  BusinessActivityPageDto,
  BusinessAuditEventPageDto,
  BusinessContactDto,
  BusinessContactPageDto,
  BusinessContactQueryDto,
  BusinessCustomerDto,
  BusinessCustomerPageDto,
  BusinessCustomerQueryDto,
  BusinessExportPreviewDto,
  BusinessExportQueryDto,
  BusinessFollowUpDto,
  BusinessFollowUpPageDto,
  BusinessOwnerTransferPageDto,
  BusinessTagDto,
  BusinessTagPageDto,
  BusinessTagQueryDto,
  BusinessTargetQueryDto,
  BusinessTaskDto,
  BusinessTaskPageDto,
  BusinessTaskQueryDto,
  TransferBusinessOwnerDto,
  UpdateBusinessContactDto,
  UpdateBusinessCustomerDto,
  UpdateBusinessTagDto,
} from './business.dto';
import { BusinessRepository } from './business.repository';

class BusinessDeleteResultDto {
  @ApiProperty()
  deleted!: true;
}

@ApiBearerAuth()
@ApiTags('Business Core')
@Controller('business/core')
export class BusinessCoreController {
  constructor(private readonly repository: BusinessRepository) {}

  @Get('export')
  @RequirePermission('business:core:export')
  @ApiOkResponse({ type: BusinessExportPreviewDto })
  exportBusiness(
    @Query() query: BusinessExportQueryDto,
  ): Promise<BusinessExportPreviewDto> {
    return this.repository.exportBusiness(query);
  }

  @Get('tags')
  @RequirePermission('business:core:read')
  @ApiOkResponse({ type: BusinessTagPageDto })
  listTags(@Query() query: BusinessTagQueryDto): Promise<BusinessTagPageDto> {
    return this.repository.listTags(query);
  }

  @Post('tags')
  @RequirePermission('business:core:create')
  @AuditOperation({ action: 'create-tag', resource: 'business.core' })
  @ApiOkResponse({ type: BusinessTagDto })
  createTag(@Body() body: CreateBusinessTagDto): Promise<BusinessTagDto> {
    return this.repository.createTag(body);
  }

  @Patch('tags/:id')
  @RequirePermission('business:core:update')
  @AuditOperation({
    action: 'update-tag',
    resource: 'business.core',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: BusinessTagDto })
  updateTag(
    @Param('id') id: string,
    @Body() body: UpdateBusinessTagDto,
  ): Promise<BusinessTagDto> {
    return this.repository.updateTag(id, body);
  }

  @Get('customers')
  @RequirePermission('business:core:read')
  @ApiOkResponse({ type: BusinessCustomerPageDto })
  listCustomers(
    @Query() query: BusinessCustomerQueryDto,
  ): Promise<BusinessCustomerPageDto> {
    return this.repository.listCustomers(query);
  }

  @Get('customers/:id')
  @RequirePermission('business:core:read')
  @ApiOkResponse({ type: BusinessCustomerDto })
  getCustomer(@Param('id') id: string): Promise<BusinessCustomerDto> {
    return this.repository.getCustomer(id);
  }

  @Post('customers')
  @RequirePermission('business:core:create')
  @AuditOperation({ action: 'create-customer', resource: 'business.core' })
  @ApiOkResponse({ type: BusinessCustomerDto })
  createCustomer(
    @Body() body: CreateBusinessCustomerDto,
  ): Promise<BusinessCustomerDto> {
    return this.repository.createCustomer(body);
  }

  @Patch('customers/:id')
  @RequirePermission('business:core:update')
  @AuditOperation({
    action: 'update-customer',
    resource: 'business.core',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: BusinessCustomerDto })
  updateCustomer(
    @Param('id') id: string,
    @Body() body: UpdateBusinessCustomerDto,
  ): Promise<BusinessCustomerDto> {
    return this.repository.updateCustomer(id, body);
  }

  @Patch('customers/:id/transfer')
  @RequirePermission('business:core:assign')
  @AuditOperation({
    action: 'transfer-customer',
    resource: 'business.core',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: BusinessCustomerDto })
  transferCustomerOwner(
    @Param('id') id: string,
    @Body() body: TransferBusinessOwnerDto,
  ): Promise<BusinessCustomerDto> {
    return this.repository.transferCustomerOwner(id, body);
  }

  @Delete('customers/:id')
  @RequirePermission('business:core:delete')
  @AuditOperation({
    action: 'archive-customer',
    resource: 'business.core',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: BusinessDeleteResultDto })
  archiveCustomer(@Param('id') id: string): Promise<{ deleted: true }> {
    return this.repository.archiveCustomer(id);
  }

  @Get('contacts')
  @RequirePermission('business:core:read')
  @ApiOkResponse({ type: BusinessContactPageDto })
  listContacts(
    @Query() query: BusinessContactQueryDto,
  ): Promise<BusinessContactPageDto> {
    return this.repository.listContacts(query);
  }

  @Get('contacts/:id')
  @RequirePermission('business:core:read')
  @ApiOkResponse({ type: BusinessContactDto })
  getContact(@Param('id') id: string): Promise<BusinessContactDto> {
    return this.repository.getContact(id);
  }

  @Post('contacts')
  @RequirePermission('business:core:create')
  @AuditOperation({ action: 'create-contact', resource: 'business.core' })
  @ApiOkResponse({ type: BusinessContactDto })
  createContact(
    @Body() body: CreateBusinessContactDto,
  ): Promise<BusinessContactDto> {
    return this.repository.createContact(body);
  }

  @Patch('contacts/:id')
  @RequirePermission('business:core:update')
  @AuditOperation({
    action: 'update-contact',
    resource: 'business.core',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: BusinessContactDto })
  updateContact(
    @Param('id') id: string,
    @Body() body: UpdateBusinessContactDto,
  ): Promise<BusinessContactDto> {
    return this.repository.updateContact(id, body);
  }

  @Delete('contacts/:id')
  @RequirePermission('business:core:delete')
  @AuditOperation({
    action: 'archive-contact',
    resource: 'business.core',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: BusinessDeleteResultDto })
  archiveContact(@Param('id') id: string): Promise<{ deleted: true }> {
    return this.repository.archiveContact(id);
  }

  @Get('activity')
  @RequirePermission('business:core:read')
  @ApiOkResponse({ type: BusinessActivityPageDto })
  listActivities(
    @Query() query: BusinessTargetQueryDto,
  ): Promise<BusinessActivityPageDto> {
    return this.repository.listActivities(query);
  }

  @Get('follow-ups')
  @RequirePermission('business:core:read')
  @ApiOkResponse({ type: BusinessFollowUpPageDto })
  listFollowUps(
    @Query() query: BusinessTargetQueryDto,
  ): Promise<BusinessFollowUpPageDto> {
    return this.repository.listFollowUps(query);
  }

  @Post('follow-ups')
  @RequirePermission('business:core:comment')
  @AuditOperation({ action: 'create-follow-up', resource: 'business.core' })
  @ApiOkResponse({ type: BusinessFollowUpDto })
  createFollowUp(
    @Body() body: CreateBusinessFollowUpDto,
  ): Promise<BusinessFollowUpDto> {
    return this.repository.createFollowUp(body);
  }

  @Get('tasks')
  @RequirePermission('business:core:read')
  @ApiOkResponse({ type: BusinessTaskPageDto })
  listTasks(
    @Query() query: BusinessTaskQueryDto,
  ): Promise<BusinessTaskPageDto> {
    return this.repository.listTasks(query);
  }

  @Post('tasks')
  @RequirePermission('business:core:update')
  @AuditOperation({ action: 'create-task', resource: 'business.core' })
  @ApiOkResponse({ type: BusinessTaskDto })
  createTask(@Body() body: CreateBusinessTaskDto): Promise<BusinessTaskDto> {
    return this.repository.createTask(body);
  }

  @Patch('tasks/:id/complete')
  @RequirePermission('business:core:update')
  @AuditOperation({
    action: 'complete-task',
    resource: 'business.core',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: BusinessTaskDto })
  completeTask(
    @Param('id') id: string,
    @Body() body: CompleteBusinessTaskDto,
  ): Promise<BusinessTaskDto> {
    return this.repository.completeTask(id, body);
  }

  @Get('attachments')
  @RequirePermission('business:core:read')
  @ApiOkResponse({ type: BusinessAttachmentPageDto })
  listAttachments(
    @Query() query: BusinessTargetQueryDto,
  ): Promise<BusinessAttachmentPageDto> {
    return this.repository.listAttachments(query);
  }

  @Post('attachments')
  @RequirePermission('business:core:update')
  @AuditOperation({ action: 'create-attachment', resource: 'business.core' })
  @ApiOkResponse({ type: BusinessAttachmentDto })
  createAttachment(
    @Body() body: CreateBusinessAttachmentDto,
  ): Promise<BusinessAttachmentDto> {
    return this.repository.createAttachment(body);
  }

  @Get('owner-transfers')
  @RequirePermission('business:core:read')
  @ApiOkResponse({ type: BusinessOwnerTransferPageDto })
  listOwnerTransfers(
    @Query() query: BusinessTargetQueryDto,
  ): Promise<BusinessOwnerTransferPageDto> {
    return this.repository.listOwnerTransfers(query);
  }

  @Get('audit-events')
  @RequirePermission('business:core:read')
  @ApiOkResponse({ type: BusinessAuditEventPageDto })
  listAuditEvents(
    @Query() query: BusinessTargetQueryDto,
  ): Promise<BusinessAuditEventPageDto> {
    return this.repository.listAuditEvents(query);
  }
}
