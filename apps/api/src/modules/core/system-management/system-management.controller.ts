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
import { RequirePermission } from '../rbac/permissions.decorator';
import {
  AuditLogPageDto,
  CreateDictTypeDto,
  CreateFileAssetDto,
  CreateSystemConfigDto,
  DeleteResultDto,
  DictTypeDto,
  DictTypePageDto,
  ExportPreviewDto,
  FileAssetDto,
  FileAssetPageDto,
  LoginLogPageDto,
  PageQueryDto,
  SystemConfigDto,
  SystemConfigPageDto,
  UpdateDictTypeDto,
  UpdateFileAssetDto,
  UpdateSystemConfigDto,
} from './system-management.dto';
import { SystemManagementRepository } from './system-management.repository';

@ApiBearerAuth()
@Controller('core')
export class SystemManagementController {
  constructor(private readonly repository: SystemManagementRepository) {}

  @Get('dicts')
  @ApiTags('Core Dictionaries')
  @RequirePermission('core:dict:read')
  @ApiOkResponse({ type: DictTypePageDto })
  listDicts(@Query() query: PageQueryDto): Promise<DictTypePageDto> {
    return this.repository.listDicts(query);
  }

  @Get('dicts/export')
  @ApiTags('Core Dictionaries')
  @RequirePermission('core:dict:export')
  @ApiOkResponse({ type: ExportPreviewDto })
  exportDicts(@Query() query: PageQueryDto): Promise<ExportPreviewDto> {
    return this.repository.createExportPreview('dicts', query);
  }

  @Post('dicts')
  @ApiTags('Core Dictionaries')
  @RequirePermission('core:dict:create')
  @ApiOkResponse({ type: DictTypeDto })
  createDict(@Body() body: CreateDictTypeDto): Promise<DictTypeDto> {
    return this.repository.createDict(body);
  }

  @Patch('dicts/:code')
  @ApiTags('Core Dictionaries')
  @RequirePermission('core:dict:update')
  @ApiOkResponse({ type: DictTypeDto })
  updateDict(
    @Param('code') code: string,
    @Body() body: UpdateDictTypeDto,
  ): Promise<DictTypeDto> {
    return this.repository.updateDict(code, body);
  }

  @Delete('dicts/:code')
  @ApiTags('Core Dictionaries')
  @RequirePermission('core:dict:delete')
  @ApiOkResponse({ type: DeleteResultDto })
  deleteDict(@Param('code') code: string): Promise<DeleteResultDto> {
    return this.repository.deleteDict(code);
  }

  @Get('config')
  @ApiTags('Core System Config')
  @RequirePermission('core:config:read')
  @ApiOkResponse({ type: SystemConfigPageDto })
  listConfig(@Query() query: PageQueryDto): Promise<SystemConfigPageDto> {
    return this.repository.listConfig(query);
  }

  @Get('config/export')
  @ApiTags('Core System Config')
  @RequirePermission('core:config:export')
  @ApiOkResponse({ type: ExportPreviewDto })
  exportConfig(@Query() query: PageQueryDto): Promise<ExportPreviewDto> {
    return this.repository.createExportPreview('config', query);
  }

  @Post('config')
  @ApiTags('Core System Config')
  @RequirePermission('core:config:create')
  @ApiOkResponse({ type: SystemConfigDto })
  createConfig(@Body() body: CreateSystemConfigDto): Promise<SystemConfigDto> {
    return this.repository.createConfig(body);
  }

  @Patch('config/:key')
  @ApiTags('Core System Config')
  @RequirePermission('core:config:update')
  @ApiOkResponse({ type: SystemConfigDto })
  updateConfig(
    @Param('key') key: string,
    @Body() body: UpdateSystemConfigDto,
  ): Promise<SystemConfigDto> {
    return this.repository.updateConfig(key, body);
  }

  @Delete('config/:key')
  @ApiTags('Core System Config')
  @RequirePermission('core:config:delete')
  @ApiOkResponse({ type: DeleteResultDto })
  deleteConfig(@Param('key') key: string): Promise<DeleteResultDto> {
    return this.repository.deleteConfig(key);
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
  listAuditLogs(@Query() query: PageQueryDto): Promise<AuditLogPageDto> {
    return this.repository.listAuditLogs(query);
  }

  @Get('audit-logs/export')
  @ApiTags('Core Audit Logs')
  @RequirePermission('core:audit-log:export')
  @ApiOkResponse({ type: ExportPreviewDto })
  exportAuditLogs(@Query() query: PageQueryDto): Promise<ExportPreviewDto> {
    return this.repository.createExportPreview('audit-logs', query);
  }

  @Get('login-logs')
  @ApiTags('Core Login Logs')
  @RequirePermission('core:login-log:read')
  @ApiOkResponse({ type: LoginLogPageDto })
  listLoginLogs(@Query() query: PageQueryDto): Promise<LoginLogPageDto> {
    return this.repository.listLoginLogs(query);
  }

  @Get('login-logs/export')
  @ApiTags('Core Login Logs')
  @RequirePermission('core:login-log:export')
  @ApiOkResponse({ type: ExportPreviewDto })
  exportLoginLogs(@Query() query: PageQueryDto): Promise<ExportPreviewDto> {
    return this.repository.createExportPreview('login-logs', query);
  }
}
