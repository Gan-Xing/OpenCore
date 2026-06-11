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
import { RequirePermission } from '../../core/rbac/permissions.decorator';
import {
  ApprovalLiteDto,
  ApprovalLitePageDto,
  ApprovalLiteQueryDto,
  AssignTodoDto,
  CollaborationSummaryDto,
  CreateApprovalLiteDto,
  CreateMessageDto,
  CreateNoticeDto,
  CreateTodoDto,
  DecideApprovalLiteDto,
  DeleteResultDto,
  MessageDto,
  MessagePageDto,
  MessageQueryDto,
  NoticeDto,
  NoticePageDto,
  NoticeQueryDto,
  TodoActionDto,
  TodoDto,
  TodoPageDto,
  TodoQueryDto,
} from './collaboration.dto';
import { CollaborationRepository } from './collaboration.repository';

@ApiBearerAuth()
@Controller('collaboration')
export class CollaborationController {
  constructor(private readonly repository: CollaborationRepository) {}

  @Get('summary')
  @ApiTags('Collaboration')
  @RequirePermission('collaboration:message:read')
  @ApiOkResponse({ type: CollaborationSummaryDto })
  getSummary(): Promise<CollaborationSummaryDto> {
    return this.repository.getSummary();
  }

  @Get('messages')
  @ApiTags('Collaboration Messages')
  @RequirePermission('collaboration:message:read')
  @ApiOkResponse({ type: MessagePageDto })
  listMessages(@Query() query: MessageQueryDto): Promise<MessagePageDto> {
    return this.repository.listMessages(query);
  }

  @Get('messages/:id')
  @ApiTags('Collaboration Messages')
  @RequirePermission('collaboration:message:read')
  @ApiOkResponse({ type: MessageDto })
  getMessage(@Param('id') id: string): Promise<MessageDto> {
    return this.repository.getMessage(id);
  }

  @Post('messages')
  @ApiTags('Collaboration Messages')
  @RequirePermission('collaboration:message:create')
  @ApiOkResponse({ type: MessageDto })
  createMessage(@Body() body: CreateMessageDto): Promise<MessageDto> {
    return this.repository.createMessage(body);
  }

  @Patch('messages/:id/read')
  @ApiTags('Collaboration Messages')
  @RequirePermission('collaboration:message:update')
  @ApiOkResponse({ type: MessageDto })
  markMessageRead(@Param('id') id: string): Promise<MessageDto> {
    return this.repository.markMessageRead(id);
  }

  @Patch('messages/:id/archive')
  @ApiTags('Collaboration Messages')
  @RequirePermission('collaboration:message:update')
  @ApiOkResponse({ type: MessageDto })
  archiveMessage(@Param('id') id: string): Promise<MessageDto> {
    return this.repository.archiveMessage(id);
  }

  @Delete('messages/:id')
  @ApiTags('Collaboration Messages')
  @RequirePermission('collaboration:message:delete')
  @ApiOkResponse({ type: DeleteResultDto })
  deleteMessage(@Param('id') id: string): Promise<DeleteResultDto> {
    return this.repository.deleteMessage(id);
  }

  @Get('notices')
  @ApiTags('Collaboration Notices')
  @RequirePermission('collaboration:notice:read')
  @ApiOkResponse({ type: NoticePageDto })
  listNotices(@Query() query: NoticeQueryDto): Promise<NoticePageDto> {
    return this.repository.listNotices(query);
  }

  @Get('notices/:id')
  @ApiTags('Collaboration Notices')
  @RequirePermission('collaboration:notice:read')
  @ApiOkResponse({ type: NoticeDto })
  getNotice(@Param('id') id: string): Promise<NoticeDto> {
    return this.repository.getNotice(id);
  }

  @Post('notices')
  @ApiTags('Collaboration Notices')
  @RequirePermission('collaboration:notice:create')
  @ApiOkResponse({ type: NoticeDto })
  createNotice(@Body() body: CreateNoticeDto): Promise<NoticeDto> {
    return this.repository.createNotice(body);
  }

  @Patch('notices/:id/publish')
  @ApiTags('Collaboration Notices')
  @RequirePermission('collaboration:notice:update')
  @ApiOkResponse({ type: NoticeDto })
  publishNotice(@Param('id') id: string): Promise<NoticeDto> {
    return this.repository.publishNotice(id);
  }

  @Patch('notices/:id/archive')
  @ApiTags('Collaboration Notices')
  @RequirePermission('collaboration:notice:update')
  @ApiOkResponse({ type: NoticeDto })
  archiveNotice(@Param('id') id: string): Promise<NoticeDto> {
    return this.repository.archiveNotice(id);
  }

  @Get('todos')
  @ApiTags('Collaboration Todos')
  @RequirePermission('collaboration:todo:read')
  @ApiOkResponse({ type: TodoPageDto })
  listTodos(@Query() query: TodoQueryDto): Promise<TodoPageDto> {
    return this.repository.listTodos(query);
  }

  @Get('todos/:id')
  @ApiTags('Collaboration Todos')
  @RequirePermission('collaboration:todo:read')
  @ApiOkResponse({ type: TodoDto })
  getTodo(@Param('id') id: string): Promise<TodoDto> {
    return this.repository.getTodo(id);
  }

  @Post('todos')
  @ApiTags('Collaboration Todos')
  @RequirePermission('collaboration:todo:create')
  @ApiOkResponse({ type: TodoDto })
  createTodo(@Body() body: CreateTodoDto): Promise<TodoDto> {
    return this.repository.createTodo(body);
  }

  @Patch('todos/:id/assign')
  @ApiTags('Collaboration Todos')
  @RequirePermission('collaboration:todo:update')
  @ApiOkResponse({ type: TodoDto })
  assignTodo(
    @Param('id') id: string,
    @Body() body: AssignTodoDto,
  ): Promise<TodoDto> {
    return this.repository.assignTodo(id, body);
  }

  @Patch('todos/:id/complete')
  @ApiTags('Collaboration Todos')
  @RequirePermission('collaboration:todo:update')
  @ApiOkResponse({ type: TodoDto })
  completeTodo(
    @Param('id') id: string,
    @Body() body: TodoActionDto,
  ): Promise<TodoDto> {
    return this.repository.completeTodo(id, body);
  }

  @Patch('todos/:id/cancel')
  @ApiTags('Collaboration Todos')
  @RequirePermission('collaboration:todo:update')
  @ApiOkResponse({ type: TodoDto })
  cancelTodo(
    @Param('id') id: string,
    @Body() body: TodoActionDto,
  ): Promise<TodoDto> {
    return this.repository.cancelTodo(id, body);
  }

  @Get('approvals')
  @ApiTags('Collaboration Approval Lite')
  @RequirePermission('collaboration:approval-lite:read')
  @ApiOkResponse({ type: ApprovalLitePageDto })
  listApprovalLiteRequests(
    @Query() query: ApprovalLiteQueryDto,
  ): Promise<ApprovalLitePageDto> {
    return this.repository.listApprovalLiteRequests(query);
  }

  @Get('approvals/:id')
  @ApiTags('Collaboration Approval Lite')
  @RequirePermission('collaboration:approval-lite:read')
  @ApiOkResponse({ type: ApprovalLiteDto })
  getApprovalLiteRequest(@Param('id') id: string): Promise<ApprovalLiteDto> {
    return this.repository.getApprovalLiteRequest(id);
  }

  @Post('approvals')
  @ApiTags('Collaboration Approval Lite')
  @RequirePermission('collaboration:approval-lite:create')
  @ApiOkResponse({ type: ApprovalLiteDto })
  createApprovalLiteRequest(
    @Body() body: CreateApprovalLiteDto,
  ): Promise<ApprovalLiteDto> {
    return this.repository.createApprovalLiteRequest(body);
  }

  @Patch('approvals/:id/approve')
  @ApiTags('Collaboration Approval Lite')
  @RequirePermission('collaboration:approval-lite:update')
  @ApiOkResponse({ type: ApprovalLiteDto })
  approveApprovalLiteRequest(
    @Param('id') id: string,
    @Body() body: DecideApprovalLiteDto,
  ): Promise<ApprovalLiteDto> {
    return this.repository.approveApprovalLiteRequest(id, body);
  }

  @Patch('approvals/:id/reject')
  @ApiTags('Collaboration Approval Lite')
  @RequirePermission('collaboration:approval-lite:update')
  @ApiOkResponse({ type: ApprovalLiteDto })
  rejectApprovalLiteRequest(
    @Param('id') id: string,
    @Body() body: DecideApprovalLiteDto,
  ): Promise<ApprovalLiteDto> {
    return this.repository.rejectApprovalLiteRequest(id, body);
  }
}
