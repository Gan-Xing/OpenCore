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
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AuditOperation } from '@opencore/audit';
import { RequirePermission } from '../../core/rbac/permissions.decorator';
import {
  AssignTicketDto,
  BatchAssignTicketsDto,
  BatchTicketActionDto,
  ChangeTicketStatusDto,
  CreateTicketAttachmentDto,
  CreateTicketCategoryDto,
  CreateTicketCommentDto,
  CreateTicketDto,
  TicketActionDto,
  TicketBatchMutationDto,
  TicketCategoryDto,
  TicketCategoryPageDto,
  TicketCategoryQueryDto,
  TicketDashboardSummaryDto,
  TicketDto,
  TicketExportPreviewDto,
  TicketPageDto,
  TicketQueryDto,
  TicketSlaReminderDto,
  TicketTransitionExportQueryDto,
  UpdateTicketCategoryDto,
  UpdateTicketDto,
} from './ticket.dto';
import { TicketRepository } from './ticket.repository';

class DeleteResultDto {
  deleted!: true;
}

@ApiBearerAuth()
@ApiTags('Collaboration Tickets')
@Controller('collaboration/tickets')
export class TicketController {
  constructor(private readonly repository: TicketRepository) {}

  @Get('categories')
  @ApiTags('Collaboration Tickets')
  @RequirePermission('collaboration:ticket:read')
  @ApiOkResponse({ type: TicketCategoryPageDto })
  listCategories(
    @Query() query: TicketCategoryQueryDto,
  ): Promise<TicketCategoryPageDto> {
    return this.repository.listCategories(query);
  }

  @Post('categories')
  @ApiTags('Collaboration Tickets')
  @RequirePermission('collaboration:ticket:create')
  @AuditOperation({
    action: 'create-category',
    resource: 'collaboration.ticket',
  })
  @ApiOkResponse({ type: TicketCategoryDto })
  createCategory(
    @Body() body: CreateTicketCategoryDto,
  ): Promise<TicketCategoryDto> {
    return this.repository.createCategory(body);
  }

  @Patch('categories/:id')
  @ApiTags('Collaboration Tickets')
  @RequirePermission('collaboration:ticket:update')
  @AuditOperation({
    action: 'update-category',
    resource: 'collaboration.ticket',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: TicketCategoryDto })
  updateCategory(
    @Param('id') id: string,
    @Body() body: UpdateTicketCategoryDto,
  ): Promise<TicketCategoryDto> {
    return this.repository.updateCategory(id, body);
  }

  @Get()
  @ApiTags('Collaboration Tickets')
  @RequirePermission('collaboration:ticket:read')
  @ApiOkResponse({ type: TicketPageDto })
  listTickets(@Query() query: TicketQueryDto): Promise<TicketPageDto> {
    return this.repository.listTickets(query);
  }

  @Get('summary')
  @ApiTags('Collaboration Tickets')
  @RequirePermission('collaboration:ticket:read')
  @ApiOkResponse({ type: TicketDashboardSummaryDto })
  getDashboardSummary(): Promise<TicketDashboardSummaryDto> {
    return this.repository.getDashboardSummary();
  }

  @Get('export')
  @ApiTags('Collaboration Tickets')
  @RequirePermission('collaboration:ticket:read')
  @ApiOkResponse({ type: TicketExportPreviewDto })
  exportTickets(
    @Query() query: TicketQueryDto,
  ): Promise<TicketExportPreviewDto> {
    return this.repository.exportTickets(query);
  }

  @Get('transitions/export')
  @ApiTags('Collaboration Tickets')
  @RequirePermission('collaboration:ticket:read')
  @ApiOkResponse({ type: TicketExportPreviewDto })
  exportTicketTransitions(
    @Query() query: TicketTransitionExportQueryDto,
  ): Promise<TicketExportPreviewDto> {
    return this.repository.exportTicketTransitions(query);
  }

  @Post('sla/reminders')
  @ApiTags('Collaboration Tickets')
  @RequirePermission('collaboration:ticket:update')
  @AuditOperation({
    action: 'sla-reminder',
    resource: 'collaboration.ticket',
  })
  @ApiOkResponse({ type: TicketSlaReminderDto })
  sendSlaReminders(): Promise<TicketSlaReminderDto> {
    return this.repository.sendSlaReminders();
  }

  @Patch('batch/assign')
  @ApiTags('Collaboration Tickets')
  @RequirePermission('collaboration:ticket:assign')
  @AuditOperation({
    action: 'batch-assign',
    resource: 'collaboration.ticket',
  })
  @ApiOkResponse({ type: TicketBatchMutationDto })
  batchAssignTickets(
    @Body() body: BatchAssignTicketsDto,
  ): Promise<TicketBatchMutationDto> {
    return this.repository.batchAssignTickets(body);
  }

  @Patch('batch/close')
  @ApiTags('Collaboration Tickets')
  @RequirePermission('collaboration:ticket:close')
  @AuditOperation({
    action: 'batch-close',
    resource: 'collaboration.ticket',
  })
  @ApiOkResponse({ type: TicketBatchMutationDto })
  batchCloseTickets(
    @Body() body: BatchTicketActionDto,
  ): Promise<TicketBatchMutationDto> {
    return this.repository.batchCloseTickets(body);
  }

  @Patch('batch/archive')
  @ApiTags('Collaboration Tickets')
  @RequirePermission('collaboration:ticket:delete')
  @AuditOperation({
    action: 'batch-archive',
    resource: 'collaboration.ticket',
  })
  @ApiOkResponse({ type: TicketBatchMutationDto })
  batchArchiveTickets(
    @Body() body: BatchTicketActionDto,
  ): Promise<TicketBatchMutationDto> {
    return this.repository.batchArchiveTickets(body);
  }

  @Get(':id')
  @ApiTags('Collaboration Tickets')
  @RequirePermission('collaboration:ticket:read')
  @ApiOkResponse({ type: TicketDto })
  getTicket(@Param('id') id: string): Promise<TicketDto> {
    return this.repository.getTicket(id);
  }

  @Post()
  @ApiTags('Collaboration Tickets')
  @RequirePermission('collaboration:ticket:create')
  @AuditOperation({
    action: 'create',
    resource: 'collaboration.ticket',
  })
  @ApiOkResponse({ type: TicketDto })
  createTicket(@Body() body: CreateTicketDto): Promise<TicketDto> {
    return this.repository.createTicket(body);
  }

  @Patch(':id')
  @ApiTags('Collaboration Tickets')
  @RequirePermission('collaboration:ticket:update')
  @AuditOperation({
    action: 'update',
    resource: 'collaboration.ticket',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: TicketDto })
  updateTicket(
    @Param('id') id: string,
    @Body() body: UpdateTicketDto,
  ): Promise<TicketDto> {
    return this.repository.updateTicket(id, body);
  }

  @Patch(':id/assign')
  @ApiTags('Collaboration Tickets')
  @RequirePermission('collaboration:ticket:assign')
  @AuditOperation({
    action: 'assign',
    resource: 'collaboration.ticket',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: TicketDto })
  assignTicket(
    @Param('id') id: string,
    @Body() body: AssignTicketDto,
  ): Promise<TicketDto> {
    return this.repository.assignTicket(id, body);
  }

  @Patch(':id/status')
  @ApiTags('Collaboration Tickets')
  @RequirePermission('collaboration:ticket:update')
  @AuditOperation({
    action: 'change-status',
    resource: 'collaboration.ticket',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: TicketDto })
  changeTicketStatus(
    @Param('id') id: string,
    @Body() body: ChangeTicketStatusDto,
  ): Promise<TicketDto> {
    return this.repository.changeTicketStatus(id, body);
  }

  @Patch(':id/close')
  @ApiTags('Collaboration Tickets')
  @RequirePermission('collaboration:ticket:close')
  @AuditOperation({
    action: 'close',
    resource: 'collaboration.ticket',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: TicketDto })
  closeTicket(
    @Param('id') id: string,
    @Body() body: TicketActionDto,
  ): Promise<TicketDto> {
    return this.repository.closeTicket(id, body);
  }

  @Patch(':id/reopen')
  @ApiTags('Collaboration Tickets')
  @RequirePermission('collaboration:ticket:update')
  @AuditOperation({
    action: 'reopen',
    resource: 'collaboration.ticket',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: TicketDto })
  reopenTicket(
    @Param('id') id: string,
    @Body() body: TicketActionDto,
  ): Promise<TicketDto> {
    return this.repository.reopenTicket(id, body);
  }

  @Post(':id/comments')
  @ApiTags('Collaboration Tickets')
  @RequirePermission('collaboration:ticket:comment')
  @AuditOperation({
    action: 'comment',
    resource: 'collaboration.ticket',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: TicketDto })
  addComment(
    @Param('id') id: string,
    @Body() body: CreateTicketCommentDto,
  ): Promise<TicketDto> {
    return this.repository.addComment(id, body);
  }

  @Post(':id/attachments')
  @ApiTags('Collaboration Tickets')
  @RequirePermission('collaboration:ticket:update')
  @AuditOperation({
    action: 'attach',
    resource: 'collaboration.ticket',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: TicketDto })
  addAttachment(
    @Param('id') id: string,
    @Body() body: CreateTicketAttachmentDto,
  ): Promise<TicketDto> {
    return this.repository.addAttachment(id, body);
  }

  @Delete(':id')
  @ApiTags('Collaboration Tickets')
  @RequirePermission('collaboration:ticket:delete')
  @AuditOperation({
    action: 'archive',
    resource: 'collaboration.ticket',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: DeleteResultDto })
  archiveTicket(@Param('id') id: string): Promise<{ deleted: true }> {
    return this.repository.archiveTicket(id);
  }
}
