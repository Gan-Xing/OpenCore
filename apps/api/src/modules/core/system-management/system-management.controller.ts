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
import {
  AuditLoginLogService,
  AuditOperationLogService,
} from '@opencore/audit';
import {
  SystemConfigService,
  SystemDeptService,
  SystemDictService,
  SystemNoticeService,
  SystemPostService,
} from '@opencore/system';
import { RequirePermission } from '../rbac/permissions.decorator';
import {
  AuditLogPageDto,
  AuditLogQueryDto,
  CreateDictTypeDto,
  CreateFileAssetDto,
  CreateSystemDeptDto,
  CreateSystemConfigDto,
  CreateSystemNoticeDto,
  CreateSystemPostDto,
  DeleteResultDto,
  DictTypeDto,
  DictTypePageDto,
  ExportPreviewDto,
  FileAssetDto,
  FileAssetPageDto,
  LoginLogPageDto,
  LoginLogQueryDto,
  PageQueryDto,
  SystemDeptDto,
  SystemDeptQueryDto,
  SystemDeptTreeDto,
  SystemConfigDto,
  SystemConfigPageDto,
  SystemNoticeDto,
  SystemNoticePageDto,
  SystemNoticeQueryDto,
  SystemPostDto,
  SystemPostPageDto,
  SystemPostQueryDto,
  UpdateSystemDeptDto,
  UpdateDictTypeDto,
  UpdateFileAssetDto,
  UpdateSystemConfigDto,
  UpdateSystemNoticeDto,
  UpdateSystemPostDto,
} from './system-management.dto';
import { SystemManagementRepository } from './system-management.repository';

@ApiBearerAuth()
@Controller('core')
export class SystemManagementController {
  constructor(
    private readonly dicts: SystemDictService,
    private readonly config: SystemConfigService,
    private readonly notices: SystemNoticeService,
    private readonly depts: SystemDeptService,
    private readonly posts: SystemPostService,
    private readonly operationLogs: AuditOperationLogService,
    private readonly loginLogs: AuditLoginLogService,
    private readonly repository: SystemManagementRepository,
  ) {}

  @Get('dicts')
  @ApiTags('Core Dictionaries')
  @RequirePermission('core:dict:read')
  @ApiOkResponse({ type: DictTypePageDto })
  listDicts(@Query() query: PageQueryDto): Promise<DictTypePageDto> {
    return this.dicts.listDicts(query);
  }

  @Get('dicts/export')
  @ApiTags('Core Dictionaries')
  @RequirePermission('core:dict:export')
  @ApiOkResponse({ type: ExportPreviewDto })
  exportDicts(@Query() query: PageQueryDto): Promise<ExportPreviewDto> {
    return this.dicts.createExportPreview(query);
  }

  @Post('dicts')
  @ApiTags('Core Dictionaries')
  @RequirePermission('core:dict:create')
  @ApiOkResponse({ type: DictTypeDto })
  createDict(@Body() body: CreateDictTypeDto): Promise<DictTypeDto> {
    return this.dicts.createDict(body);
  }

  @Patch('dicts/:code')
  @ApiTags('Core Dictionaries')
  @RequirePermission('core:dict:update')
  @ApiOkResponse({ type: DictTypeDto })
  updateDict(
    @Param('code') code: string,
    @Body() body: UpdateDictTypeDto,
  ): Promise<DictTypeDto> {
    return this.dicts.updateDict(code, body);
  }

  @Delete('dicts/:code')
  @ApiTags('Core Dictionaries')
  @RequirePermission('core:dict:delete')
  @ApiOkResponse({ type: DeleteResultDto })
  deleteDict(@Param('code') code: string): Promise<DeleteResultDto> {
    return this.dicts.deleteDict(code);
  }

  @Get('config')
  @ApiTags('Core System Config')
  @RequirePermission('core:config:read')
  @ApiOkResponse({ type: SystemConfigPageDto })
  listConfig(@Query() query: PageQueryDto): Promise<SystemConfigPageDto> {
    return this.config.listConfig(query);
  }

  @Get('config/export')
  @ApiTags('Core System Config')
  @RequirePermission('core:config:export')
  @ApiOkResponse({ type: ExportPreviewDto })
  exportConfig(@Query() query: PageQueryDto): Promise<ExportPreviewDto> {
    return this.config.createExportPreview(query);
  }

  @Post('config')
  @ApiTags('Core System Config')
  @RequirePermission('core:config:create')
  @ApiOkResponse({ type: SystemConfigDto })
  createConfig(@Body() body: CreateSystemConfigDto): Promise<SystemConfigDto> {
    return this.config.createConfig(body);
  }

  @Patch('config/:key')
  @ApiTags('Core System Config')
  @RequirePermission('core:config:update')
  @ApiOkResponse({ type: SystemConfigDto })
  updateConfig(
    @Param('key') key: string,
    @Body() body: UpdateSystemConfigDto,
  ): Promise<SystemConfigDto> {
    return this.config.updateConfig(key, body);
  }

  @Delete('config/:key')
  @ApiTags('Core System Config')
  @RequirePermission('core:config:delete')
  @ApiOkResponse({ type: DeleteResultDto })
  deleteConfig(@Param('key') key: string): Promise<DeleteResultDto> {
    return this.config.deleteConfig(key);
  }

  @Get('notices')
  @ApiTags('Core System Notices')
  @RequirePermission('core:notice:read')
  @ApiOkResponse({ type: SystemNoticePageDto })
  listNotices(
    @Query() query: SystemNoticeQueryDto,
  ): Promise<SystemNoticePageDto> {
    return this.notices.listNotices(query);
  }

  @Get('notices/export')
  @ApiTags('Core System Notices')
  @RequirePermission('core:notice:export')
  @ApiOkResponse({ type: ExportPreviewDto })
  exportNotices(
    @Query() query: SystemNoticeQueryDto,
  ): Promise<ExportPreviewDto> {
    return this.notices.createExportPreview(query);
  }

  @Get('notices/:id')
  @ApiTags('Core System Notices')
  @RequirePermission('core:notice:read')
  @ApiOkResponse({ type: SystemNoticeDto })
  getNotice(@Param('id') id: string): Promise<SystemNoticeDto> {
    return this.notices.getNotice(id);
  }

  @Post('notices')
  @ApiTags('Core System Notices')
  @RequirePermission('core:notice:create')
  @ApiOkResponse({ type: SystemNoticeDto })
  createNotice(@Body() body: CreateSystemNoticeDto): Promise<SystemNoticeDto> {
    return this.notices.createNotice(body);
  }

  @Patch('notices/:id')
  @ApiTags('Core System Notices')
  @RequirePermission('core:notice:update')
  @ApiOkResponse({ type: SystemNoticeDto })
  updateNotice(
    @Param('id') id: string,
    @Body() body: UpdateSystemNoticeDto,
  ): Promise<SystemNoticeDto> {
    return this.notices.updateNotice(id, body);
  }

  @Patch('notices/:id/publish')
  @ApiTags('Core System Notices')
  @RequirePermission('core:notice:update')
  @ApiOkResponse({ type: SystemNoticeDto })
  publishNotice(@Param('id') id: string): Promise<SystemNoticeDto> {
    return this.notices.publishNotice(id);
  }

  @Patch('notices/:id/archive')
  @ApiTags('Core System Notices')
  @RequirePermission('core:notice:update')
  @ApiOkResponse({ type: SystemNoticeDto })
  archiveNotice(@Param('id') id: string): Promise<SystemNoticeDto> {
    return this.notices.archiveNotice(id);
  }

  @Delete('notices/:id')
  @ApiTags('Core System Notices')
  @RequirePermission('core:notice:delete')
  @ApiOkResponse({ type: DeleteResultDto })
  deleteNotice(@Param('id') id: string): Promise<DeleteResultDto> {
    return this.notices.deleteNotice(id);
  }

  @Get('depts')
  @ApiTags('Core Departments')
  @RequirePermission('core:dept:read')
  @ApiOkResponse({ type: [SystemDeptTreeDto] })
  listDepts(
    @Query() query: SystemDeptQueryDto,
  ): Promise<readonly SystemDeptTreeDto[]> {
    return this.depts.listDeptTree(query);
  }

  @Get('depts/export')
  @ApiTags('Core Departments')
  @RequirePermission('core:dept:export')
  @ApiOkResponse({ type: ExportPreviewDto })
  exportDepts(@Query() query: SystemDeptQueryDto): Promise<ExportPreviewDto> {
    return this.depts.createExportPreview(query);
  }

  @Post('depts')
  @ApiTags('Core Departments')
  @RequirePermission('core:dept:create')
  @ApiOkResponse({ type: SystemDeptDto })
  createDept(@Body() body: CreateSystemDeptDto): Promise<SystemDeptDto> {
    return this.depts.createDept(body);
  }

  @Patch('depts/:id')
  @ApiTags('Core Departments')
  @RequirePermission('core:dept:update')
  @ApiOkResponse({ type: SystemDeptDto })
  updateDept(
    @Param('id') id: string,
    @Body() body: UpdateSystemDeptDto,
  ): Promise<SystemDeptDto> {
    return this.depts.updateDept(id, body);
  }

  @Delete('depts/:id')
  @ApiTags('Core Departments')
  @RequirePermission('core:dept:delete')
  @ApiOkResponse({ type: DeleteResultDto })
  deleteDept(@Param('id') id: string): Promise<DeleteResultDto> {
    return this.depts.deleteDept(id);
  }

  @Get('posts')
  @ApiTags('Core Posts')
  @RequirePermission('core:post:read')
  @ApiOkResponse({ type: SystemPostPageDto })
  listPosts(@Query() query: SystemPostQueryDto): Promise<SystemPostPageDto> {
    return this.posts.listPosts(query);
  }

  @Get('posts/export')
  @ApiTags('Core Posts')
  @RequirePermission('core:post:export')
  @ApiOkResponse({ type: ExportPreviewDto })
  exportPosts(@Query() query: SystemPostQueryDto): Promise<ExportPreviewDto> {
    return this.posts.createExportPreview(query);
  }

  @Post('posts')
  @ApiTags('Core Posts')
  @RequirePermission('core:post:create')
  @ApiOkResponse({ type: SystemPostDto })
  createPost(@Body() body: CreateSystemPostDto): Promise<SystemPostDto> {
    return this.posts.createPost(body);
  }

  @Patch('posts/:code')
  @ApiTags('Core Posts')
  @RequirePermission('core:post:update')
  @ApiOkResponse({ type: SystemPostDto })
  updatePost(
    @Param('code') code: string,
    @Body() body: UpdateSystemPostDto,
  ): Promise<SystemPostDto> {
    return this.posts.updatePost(code, body);
  }

  @Delete('posts/:code')
  @ApiTags('Core Posts')
  @RequirePermission('core:post:delete')
  @ApiOkResponse({ type: DeleteResultDto })
  deletePost(@Param('code') code: string): Promise<DeleteResultDto> {
    return this.posts.deletePost(code);
  }

  @Get('files')
  @ApiTags('Core Files')
  @RequirePermission('core:file:read')
  @ApiOkResponse({ type: FileAssetPageDto })
  listFiles(@Query() query: PageQueryDto): Promise<FileAssetPageDto> {
    return this.repository.listFiles(query);
  }

  @Get('files/export')
  @ApiTags('Core Files')
  @RequirePermission('core:file:export')
  @ApiOkResponse({ type: ExportPreviewDto })
  exportFiles(@Query() query: PageQueryDto): Promise<ExportPreviewDto> {
    return this.repository.createExportPreview('files', query);
  }

  @Post('files')
  @ApiTags('Core Files')
  @RequirePermission('core:file:create')
  @ApiOkResponse({ type: FileAssetDto })
  createFileAsset(@Body() body: CreateFileAssetDto): Promise<FileAssetDto> {
    return this.repository.createFileAsset(body);
  }

  @Patch('files/:id')
  @ApiTags('Core Files')
  @RequirePermission('core:file:update')
  @ApiOkResponse({ type: FileAssetDto })
  updateFileAsset(
    @Param('id') id: string,
    @Body() body: UpdateFileAssetDto,
  ): Promise<FileAssetDto> {
    return this.repository.updateFileAsset(id, body);
  }

  @Delete('files/:id')
  @ApiTags('Core Files')
  @RequirePermission('core:file:delete')
  @ApiOkResponse({ type: DeleteResultDto })
  deleteFile(@Param('id') id: string): Promise<DeleteResultDto> {
    return this.repository.deleteFile(id);
  }

  @Get('audit-logs')
  @ApiTags('Core Audit Logs')
  @RequirePermission('core:audit-log:read')
  @ApiOkResponse({ type: AuditLogPageDto })
  listAuditLogs(@Query() query: AuditLogQueryDto): Promise<AuditLogPageDto> {
    return this.operationLogs.listOperationLogs(query);
  }

  @Get('audit-logs/export')
  @ApiTags('Core Audit Logs')
  @RequirePermission('core:audit-log:export')
  @ApiOkResponse({ type: ExportPreviewDto })
  exportAuditLogs(@Query() query: AuditLogQueryDto): Promise<ExportPreviewDto> {
    return this.operationLogs.createExportPreview(query);
  }

  @Get('login-logs')
  @ApiTags('Core Login Logs')
  @RequirePermission('core:login-log:read')
  @ApiOkResponse({ type: LoginLogPageDto })
  listLoginLogs(@Query() query: LoginLogQueryDto): Promise<LoginLogPageDto> {
    return this.loginLogs.listLoginLogs(query);
  }

  @Get('login-logs/export')
  @ApiTags('Core Login Logs')
  @RequirePermission('core:login-log:export')
  @ApiOkResponse({ type: ExportPreviewDto })
  exportLoginLogs(@Query() query: LoginLogQueryDto): Promise<ExportPreviewDto> {
    return this.loginLogs.createExportPreview(query);
  }
}
