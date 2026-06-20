import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import {
  AuditLoginLogService,
  AuditOperationLogService,
} from '@opencore/audit';
import { createIpLocationProviderFromEnv } from '@opencore/common';
import { FileStorageService } from '@opencore/file';
import {
  SystemConfigService,
  SystemDeptService,
  SystemDictService,
  type SystemNoticeRealtimeEvent,
  SystemNoticeService,
  SystemPostService,
} from '@opencore/system';
import {
  SecurityLoginLockoutRepository,
  type SecurityRequestWithAuth,
} from '@opencore/security';
import {
  RequireAuthenticated,
  RequirePermission,
} from '../rbac/permissions.decorator';
import {
  AuditLogPageDto,
  AuditLogQueryDto,
  AuditLogBatchMutationResultDto,
  AuditLogCleanResultDto,
  BatchDeleteAuditLogsDto,
  BatchDeleteDictItemsDto,
  BatchDeleteDictTypesDto,
  BatchDeleteSystemConfigsDto,
  BatchDeleteLoginLogsDto,
  BatchDeleteSystemPostsDto,
  BatchUpdateDictItemStatusDto,
  BatchUpdateDictStatusDto,
  CleanAuditLogsDto,
  CreateDictItemDto,
  CreateDictTypeDto,
  CreateFileAssetDto,
  CreateSystemDeptDto,
  CreateSystemConfigDto,
  CreateSystemNoticeDto,
  CreateSystemNoticeFromTemplateDto,
  CreateSystemNoticeTemplateDto,
  CreateSystemPostDto,
  DeleteResultDto,
  DictDataOptionDto,
  DictDataOptionQueryDto,
  DictBatchMutationResultDto,
  DictCacheRefreshDto,
  DictDeleteMutationResultDto,
  DictImportResultDto,
  DictImportTemplateDto,
  DictItemDto,
  DictItemBatchMutationResultDto,
  DictItemDeleteMutationResultDto,
  DictItemPageDto,
  DictItemQueryDto,
  DictTranslationResultDto,
  DictTypeDto,
  DictTypePageDto,
  DictTypeQueryDto,
  ExportPreviewDto,
  FileAssetDto,
  FileAssetPageDto,
  LoginLogPageDto,
  LoginLogQueryDto,
  LoginLogDto,
  LoginLogBatchMutationResultDto,
  LoginLogCleanResultDto,
  ImportDictsDto,
  IpLocationLookupDto,
  IpLocationLookupQueryDto,
  IpLocationProviderStatusDto,
  LoginUnlockResultDto,
  PageQueryDto,
  RotateSystemConfigSecretDto,
  RotateSystemConfigVaultKeyDto,
  SystemDeptDto,
  SystemDeptOrderMutationResultDto,
  SystemDeptOptionDto,
  SystemDeptQueryDto,
  SystemDeptTreeDto,
  SystemConfigDto,
  SystemConfigCacheRefreshDto,
  SystemConfigEnvironmentOverrideDto,
  SystemConfigFeatureFlagEvaluationDto,
  SystemConfigFeatureFlagEvaluationQueryDto,
  SystemConfigBatchMutationResultDto,
  SystemConfigPageDto,
  SystemConfigRuntimeQueryDto,
  SystemConfigRuntimeDto,
  SystemConfigSecretVersionDto,
  SystemConfigVaultKeyRotationDto,
  SystemConfigVaultStatusDto,
  SystemConfigValueDto,
  SystemConfigValueQueryDto,
  SystemNoticeDto,
  SystemNoticeDeliveryExecuteDto,
  SystemNoticeDeliveryExecutionResultDto,
  SystemNoticeDeliveryMutationResultDto,
  SystemNoticeDeliveryPageDto,
  SystemNoticeDeliveryQueryDto,
  SystemNoticeDispatchDto,
  SystemNoticeInboxItemDto,
  SystemNoticeInboxPageDto,
  SystemNoticeInboxQueryDto,
  SystemNoticePageDto,
  SystemNoticeQueryDto,
  SystemNoticeReadMutationResultDto,
  SystemNoticeRealtimeEventDto,
  SystemNoticeTemplateDto,
  SystemNoticeTemplateOptionDto,
  SystemNoticeTemplatePageDto,
  SystemNoticeTemplateQueryDto,
  SystemNoticeTemplateRenderDto,
  SystemNoticeTemplateTestSendResultDto,
  SystemNoticeReadUserPageDto,
  SystemNoticeReadUsersQueryDto,
  SystemNoticeUnreadCountDto,
  SystemPostBatchMutationResultDto,
  SystemPostDto,
  SystemPostOrderMutationResultDto,
  SystemPostOptionDto,
  SystemPostPageDto,
  SystemPostQueryDto,
  UpdateSystemDeptDto,
  UpdateSystemDeptOrderDto,
  UpdateSystemPostOrderDto,
  UpdateDictItemDto,
  UpdateDictTypeDto,
  TranslateDictValuesDto,
  UpdateFileAssetDto,
  UploadFileAssetDto,
  UpdateSystemConfigDto,
  UpsertSystemConfigEnvironmentOverrideDto,
  UpdateSystemNoticeDto,
  UpdateSystemNoticeTemplateDto,
  UpdateSystemPostDto,
  UnlockLoginUserDto,
  AuditLogDto,
  MarkSystemNoticesReadDto,
  RenderSystemNoticeTemplateDto,
  TestSystemNoticeTemplateDto,
} from './system-management.dto';
import {
  systemManagementBadRequest,
  systemManagementNotFound,
  systemManagementUnauthorized,
  SystemManagementRepository,
} from './system-management.repository';

type DownloadResponse = {
  send(body: Buffer): void;
  set(headers: Record<string, string>): void;
};

type SseResponse = {
  end?: () => void;
  flushHeaders?: () => void;
  set(headers: Record<string, string>): void;
  write(chunk: string): void;
};

type RequestWithUser = SecurityRequestWithAuth;

@ApiBearerAuth()
@Controller('core')
export class SystemManagementController {
  private readonly ipLocationProvider = createIpLocationProviderFromEnv();

  constructor(
    private readonly dicts: SystemDictService,
    private readonly config: SystemConfigService,
    private readonly notices: SystemNoticeService,
    private readonly depts: SystemDeptService,
    private readonly posts: SystemPostService,
    private readonly operationLogs: AuditOperationLogService,
    private readonly loginLogs: AuditLoginLogService,
    private readonly loginLockouts: SecurityLoginLockoutRepository,
    private readonly repository: SystemManagementRepository,
    private readonly files: FileStorageService,
  ) {}

  @Get('dicts')
  @ApiTags('Core Dictionaries')
  @RequirePermission('core:dict:read')
  @ApiOkResponse({ type: DictTypePageDto })
  listDicts(@Query() query: DictTypeQueryDto): Promise<DictTypePageDto> {
    return this.dicts.listDicts(query);
  }

  @Get('dicts/export')
  @ApiTags('Core Dictionaries')
  @RequirePermission('core:dict:export')
  @ApiOkResponse({ type: ExportPreviewDto })
  exportDicts(@Query() query: DictTypeQueryDto): Promise<ExportPreviewDto> {
    return this.dicts.createExportPreview(query);
  }

  @Get('dicts/recycle-bin')
  @ApiTags('Core Dictionaries')
  @RequirePermission('core:dict:read')
  @ApiOkResponse({ type: DictTypePageDto })
  listDeletedDicts(
    @Query() query: DictTypeQueryDto,
  ): Promise<DictTypePageDto> {
    return this.dicts.listDeletedDicts(query);
  }

  @Get('dicts/import-template')
  @ApiTags('Core Dictionaries')
  @RequirePermission('core:dict:export')
  @ApiOkResponse({ type: DictImportTemplateDto })
  getDictImportTemplate(): DictImportTemplateDto {
    return this.dicts.createImportTemplate();
  }

  @Post('dicts/import/preview')
  @ApiTags('Core Dictionaries')
  @RequirePermission('core:dict:create')
  @ApiOkResponse({ type: DictImportResultDto })
  previewImportDicts(
    @Body() body: ImportDictsDto,
  ): Promise<DictImportResultDto> {
    return this.dicts.previewImportDicts(body);
  }

  @Post('dicts/import')
  @ApiTags('Core Dictionaries')
  @RequirePermission('core:dict:create')
  @ApiOkResponse({ type: DictImportResultDto })
  importDicts(@Body() body: ImportDictsDto): Promise<DictImportResultDto> {
    return this.dicts.importDicts(body);
  }

  @Get('dict-items')
  @ApiTags('Core Dictionaries')
  @RequirePermission('core:dict:read')
  @ApiOkResponse({ type: DictItemPageDto })
  listDictItemsPage(
    @Query() query: DictItemQueryDto,
  ): Promise<DictItemPageDto> {
    return this.dicts.listDictItemsPage(query);
  }

  @Get('dict-items/export')
  @ApiTags('Core Dictionaries')
  @RequirePermission('core:dict:export')
  @ApiOkResponse({ type: ExportPreviewDto })
  exportDictItems(@Query() query: DictItemQueryDto): Promise<ExportPreviewDto> {
    return this.dicts.createItemsExportPreview(query);
  }

  @Get('dict-items/recycle-bin')
  @ApiTags('Core Dictionaries')
  @RequirePermission('core:dict:read')
  @ApiOkResponse({ type: DictItemPageDto })
  listDeletedDictItemsPage(
    @Query() query: DictItemQueryDto,
  ): Promise<DictItemPageDto> {
    return this.dicts.listDeletedDictItemsPage(query);
  }

  @Patch('dicts/status')
  @ApiTags('Core Dictionaries')
  @RequirePermission('core:dict:update')
  @ApiOkResponse({ type: DictBatchMutationResultDto })
  updateDictStatus(
    @Body() body: BatchUpdateDictStatusDto,
  ): Promise<DictBatchMutationResultDto> {
    return this.dicts.updateDictStatus(body);
  }

  @Delete('dicts/batch')
  @ApiTags('Core Dictionaries')
  @RequirePermission('core:dict:delete')
  @ApiOkResponse({ type: DictDeleteMutationResultDto })
  deleteDicts(
    @Body() body: BatchDeleteDictTypesDto,
  ): Promise<DictDeleteMutationResultDto> {
    return this.dicts.deleteDicts(body);
  }

  @Patch('dict-items/status')
  @ApiTags('Core Dictionaries')
  @RequirePermission('core:dict:update')
  @ApiOkResponse({ type: DictItemBatchMutationResultDto })
  updateDictItemStatus(
    @Body() body: BatchUpdateDictItemStatusDto,
  ): Promise<DictItemBatchMutationResultDto> {
    return this.dicts.updateDictItemStatus(body);
  }

  @Delete('dict-items/batch')
  @ApiTags('Core Dictionaries')
  @RequirePermission('core:dict:delete')
  @ApiOkResponse({ type: DictItemDeleteMutationResultDto })
  deleteDictItems(
    @Body() body: BatchDeleteDictItemsDto,
  ): Promise<DictItemDeleteMutationResultDto> {
    return this.dicts.deleteDictItems(body);
  }

  @Post('dicts/refresh-cache')
  @ApiTags('Core Dictionaries')
  @RequirePermission('core:dict:manage')
  @ApiOkResponse({ type: DictCacheRefreshDto })
  refreshDictCache(): Promise<DictCacheRefreshDto> {
    return this.dicts.refreshDictCache();
  }

  @Post('dict-data/translate')
  @ApiTags('Core Dictionaries')
  @RequirePermission('core:dict:read')
  @ApiOkResponse({ type: DictTranslationResultDto })
  translateDictValues(
    @Body() body: TranslateDictValuesDto,
  ): Promise<DictTranslationResultDto> {
    return this.dicts.translateDictValues(body);
  }

  @Get('dict-data/simple-list')
  @ApiTags('Core Dictionaries')
  @ApiOkResponse({ type: [DictDataOptionDto] })
  listDictDataOptions(
    @Query() query: DictDataOptionQueryDto,
  ): Promise<readonly DictDataOptionDto[]> {
    return this.dicts.listDictDataOptions(query);
  }

  @Get('dicts/:code/items')
  @ApiTags('Core Dictionaries')
  @RequirePermission('core:dict:read')
  @ApiOkResponse({ type: [DictItemDto] })
  listDictItems(@Param('code') code: string): Promise<readonly DictItemDto[]> {
    return this.dicts.listDictItems(code);
  }

  @Get('dicts/:code/items/:itemId')
  @ApiTags('Core Dictionaries')
  @RequirePermission('core:dict:read')
  @ApiOkResponse({ type: DictItemDto })
  getDictItem(
    @Param('code') code: string,
    @Param('itemId') itemId: string,
  ): Promise<DictItemDto> {
    return this.dicts.getDictItem(code, itemId);
  }

  @Get('dicts/:code')
  @ApiTags('Core Dictionaries')
  @RequirePermission('core:dict:read')
  @ApiOkResponse({ type: DictTypeDto })
  getDict(@Param('code') code: string): Promise<DictTypeDto> {
    return this.dicts.getDict(code);
  }

  @Post('dicts')
  @ApiTags('Core Dictionaries')
  @RequirePermission('core:dict:create')
  @ApiOkResponse({ type: DictTypeDto })
  createDict(@Body() body: CreateDictTypeDto): Promise<DictTypeDto> {
    return this.dicts.createDict(body);
  }

  @Post('dicts/:code/items')
  @ApiTags('Core Dictionaries')
  @RequirePermission('core:dict:create')
  @ApiOkResponse({ type: DictItemDto })
  createDictItem(
    @Param('code') code: string,
    @Body() body: CreateDictItemDto,
  ): Promise<DictItemDto> {
    return this.dicts.createDictItem(code, body);
  }

  @Patch('dicts/:code/restore')
  @ApiTags('Core Dictionaries')
  @RequirePermission('core:dict:update')
  @ApiOkResponse({ type: DictTypeDto })
  restoreDict(@Param('code') code: string): Promise<DictTypeDto> {
    return this.dicts.restoreDict(code);
  }

  @Delete('dicts/:code/hard')
  @ApiTags('Core Dictionaries')
  @RequirePermission('core:dict:delete')
  @ApiOkResponse({ type: DeleteResultDto })
  hardDeleteDict(@Param('code') code: string): Promise<DeleteResultDto> {
    return this.dicts.hardDeleteDict(code);
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

  @Patch('dicts/:code/items/:itemId')
  @ApiTags('Core Dictionaries')
  @RequirePermission('core:dict:update')
  @ApiOkResponse({ type: DictItemDto })
  updateDictItem(
    @Param('code') code: string,
    @Param('itemId') itemId: string,
    @Body() body: UpdateDictItemDto,
  ): Promise<DictItemDto> {
    return this.dicts.updateDictItem(code, itemId, body);
  }

  @Delete('dicts/:code/items/:itemId')
  @ApiTags('Core Dictionaries')
  @RequirePermission('core:dict:delete')
  @ApiOkResponse({ type: DeleteResultDto })
  deleteDictItem(
    @Param('code') code: string,
    @Param('itemId') itemId: string,
  ): Promise<DeleteResultDto> {
    return this.dicts.deleteDictItem(code, itemId);
  }

  @Patch('dict-items/:itemId/restore')
  @ApiTags('Core Dictionaries')
  @RequirePermission('core:dict:update')
  @ApiOkResponse({ type: DictItemDto })
  restoreDictItem(@Param('itemId') itemId: string): Promise<DictItemDto> {
    return this.dicts.restoreDictItem(itemId);
  }

  @Delete('dict-items/:itemId/hard')
  @ApiTags('Core Dictionaries')
  @RequirePermission('core:dict:delete')
  @ApiOkResponse({ type: DeleteResultDto })
  hardDeleteDictItem(
    @Param('itemId') itemId: string,
  ): Promise<DeleteResultDto> {
    return this.dicts.hardDeleteDictItem(itemId);
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

  @Get('config/runtime')
  @ApiTags('Core System Config')
  @ApiOkResponse({ type: SystemConfigRuntimeDto })
  getConfigRuntime(
    @Query() query: SystemConfigRuntimeQueryDto,
  ): Promise<SystemConfigRuntimeDto> {
    return this.config.getRuntimeConfig(query);
  }

  @Get('config/get-value-by-key')
  @ApiTags('Core System Config')
  @ApiOkResponse({ type: SystemConfigValueDto })
  getConfigValueByKey(
    @Query() query: SystemConfigValueQueryDto,
  ): Promise<SystemConfigValueDto> {
    return this.config.getConfigValueByKey(query.key, query.environment);
  }

  @Get('config/feature-flags/evaluate')
  @ApiTags('Core System Config')
  @ApiOkResponse({ type: SystemConfigFeatureFlagEvaluationDto })
  evaluateFeatureFlag(
    @Query() query: SystemConfigFeatureFlagEvaluationQueryDto,
  ): Promise<SystemConfigFeatureFlagEvaluationDto> {
    return this.config.evaluateFeatureFlag(query);
  }

  @Post('config/refresh-cache')
  @ApiTags('Core System Config')
  @RequirePermission('core:config:update')
  @ApiOkResponse({ type: SystemConfigCacheRefreshDto })
  refreshConfigCache(): Promise<SystemConfigCacheRefreshDto> {
    return this.config.refreshConfigCache();
  }

  @Delete('config/batch')
  @ApiTags('Core System Config')
  @RequirePermission('core:config:delete')
  @ApiOkResponse({ type: SystemConfigBatchMutationResultDto })
  deleteConfigs(
    @Body() body: BatchDeleteSystemConfigsDto,
  ): Promise<SystemConfigBatchMutationResultDto> {
    return this.config.deleteConfigs(body);
  }

  @Get('config/:key/environments')
  @ApiTags('Core System Config')
  @RequirePermission('core:config:read')
  @ApiOkResponse({ type: [SystemConfigEnvironmentOverrideDto] })
  listConfigEnvironmentOverrides(
    @Param('key') key: string,
  ): Promise<readonly SystemConfigEnvironmentOverrideDto[]> {
    return this.config.listConfigEnvironmentOverrides(key);
  }

  @Patch('config/:key/environments/:environment')
  @ApiTags('Core System Config')
  @RequirePermission('core:config:update')
  @ApiOkResponse({ type: SystemConfigEnvironmentOverrideDto })
  upsertConfigEnvironmentOverride(
    @Param('key') key: string,
    @Param('environment') environment: string,
    @Body() body: UpsertSystemConfigEnvironmentOverrideDto,
  ): Promise<SystemConfigEnvironmentOverrideDto> {
    return this.config.upsertConfigEnvironmentOverride(key, environment, body);
  }

  @Delete('config/:key/environments/:environment')
  @ApiTags('Core System Config')
  @RequirePermission('core:config:update')
  @ApiOkResponse({ type: DeleteResultDto })
  deleteConfigEnvironmentOverride(
    @Param('key') key: string,
    @Param('environment') environment: string,
  ): Promise<DeleteResultDto> {
    return this.config.deleteConfigEnvironmentOverride(key, environment);
  }

  @Get('config/vault/status')
  @ApiTags('Core System Config')
  @RequirePermission('core:config:read')
  @ApiOkResponse({ type: SystemConfigVaultStatusDto })
  getConfigVaultStatus(): Promise<SystemConfigVaultStatusDto> {
    return this.config.getConfigVaultStatus();
  }

  @Post('config/vault/rotate-key')
  @ApiTags('Core System Config')
  @RequirePermission('core:config:update')
  @ApiOkResponse({ type: SystemConfigVaultKeyRotationDto })
  rotateConfigVaultKey(
    @Body() body: RotateSystemConfigVaultKeyDto,
  ): Promise<SystemConfigVaultKeyRotationDto> {
    return this.config.rotateConfigVaultKey(body);
  }

  @Get('config/:key/secret-versions')
  @ApiTags('Core System Config')
  @RequirePermission('core:config:read')
  @ApiOkResponse({ type: [SystemConfigSecretVersionDto] })
  listConfigSecretVersions(
    @Param('key') key: string,
  ): Promise<readonly SystemConfigSecretVersionDto[]> {
    return this.config.listConfigSecretVersions(key);
  }

  @Post('config/:key/rotate-secret')
  @ApiTags('Core System Config')
  @RequirePermission('core:config:update')
  @ApiOkResponse({ type: SystemConfigSecretVersionDto })
  rotateConfigSecret(
    @Param('key') key: string,
    @Body() body: RotateSystemConfigSecretDto,
  ): Promise<SystemConfigSecretVersionDto> {
    return this.config.rotateSecretConfig(key, body);
  }

  @Get('config/:key')
  @ApiTags('Core System Config')
  @RequirePermission('core:config:read')
  @ApiOkResponse({ type: SystemConfigDto })
  getConfig(@Param('key') key: string): Promise<SystemConfigDto> {
    return this.config.getConfig(key);
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

  @Get('notices/inbox')
  @ApiTags('Core System Notices')
  @RequireAuthenticated()
  @ApiOkResponse({ type: SystemNoticeInboxPageDto })
  listNoticeInbox(
    @Query() query: SystemNoticeInboxQueryDto,
    @Req() request: RequestWithUser,
  ): Promise<SystemNoticeInboxPageDto> {
    return this.notices.listNoticeInbox(getAuthenticatedUserId(request), query);
  }

  @Get('notices/inbox/unread-list')
  @ApiTags('Core System Notices')
  @RequireAuthenticated()
  @ApiOkResponse({ type: [SystemNoticeInboxItemDto] })
  listUnreadNoticeInbox(
    @Query('limit') limit: number | string | undefined,
    @Req() request: RequestWithUser,
  ): Promise<readonly SystemNoticeInboxItemDto[]> {
    return this.notices.listUnreadNoticeInbox(
      getAuthenticatedUserId(request),
      limit,
    );
  }

  @Get('notices/inbox/unread-count')
  @ApiTags('Core System Notices')
  @RequireAuthenticated()
  @ApiOkResponse({ type: SystemNoticeUnreadCountDto })
  async countUnreadNoticeInbox(
    @Req() request: RequestWithUser,
  ): Promise<SystemNoticeUnreadCountDto> {
    return {
      unreadCount: await this.notices.countUnreadNoticeInbox(
        getAuthenticatedUserId(request),
      ),
    };
  }

  @Get('notices/inbox/events')
  @ApiTags('Core System Notices')
  @ApiProduces('text/event-stream')
  @RequireAuthenticated()
  @ApiOkResponse({ type: SystemNoticeRealtimeEventDto })
  async streamNoticeInboxEvents(
    @Req() request: RequestWithUser,
    @Res() response: SseResponse,
  ): Promise<void> {
    const userId = getAuthenticatedUserId(request);
    response.set({
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'content-type': 'text/event-stream; charset=utf-8',
      'x-accel-buffering': 'no',
    });
    response.flushHeaders?.();

    const writeEvent = (event: SystemNoticeRealtimeEvent) => {
      writeSseEvent(response, event);
    };
    const unsubscribe = this.notices.subscribeNoticeInboxEvents(
      userId,
      writeEvent,
    );
    const heartbeat = setInterval(() => {
      response.write(': heartbeat\n\n');
    }, 15000);
    const cleanup = () => {
      clearInterval(heartbeat);
      unsubscribe();
    };

    getCloseableRequest(request).on('close', cleanup);
    writeEvent(await this.notices.createNoticeRealtimeSnapshot(userId));
  }

  @Post('notices/inbox/read')
  @ApiTags('Core System Notices')
  @RequireAuthenticated()
  @ApiOkResponse({ type: SystemNoticeReadMutationResultDto })
  markNoticesRead(
    @Req() request: RequestWithUser,
    @Body() body: MarkSystemNoticesReadDto,
  ): Promise<SystemNoticeReadMutationResultDto> {
    return this.notices.markNoticesRead(getAuthenticatedUserId(request), body);
  }

  @Post('notices/inbox/read-all')
  @ApiTags('Core System Notices')
  @RequireAuthenticated()
  @ApiOkResponse({ type: SystemNoticeReadMutationResultDto })
  markAllNoticesRead(
    @Req() request: RequestWithUser,
  ): Promise<SystemNoticeReadMutationResultDto> {
    return this.notices.markAllNoticesRead(getAuthenticatedUserId(request));
  }

  @Get('notices/inbox/:id')
  @ApiTags('Core System Notices')
  @RequireAuthenticated()
  @ApiOkResponse({ type: SystemNoticeInboxItemDto })
  getNoticeInboxItem(
    @Param('id') id: string,
    @Req() request: RequestWithUser,
  ): Promise<SystemNoticeInboxItemDto> {
    return this.notices.getNoticeInboxItem(getAuthenticatedUserId(request), id);
  }

  @Get('notices/:id/read-users')
  @ApiTags('Core System Notices')
  @RequirePermission('core:notice:read')
  @ApiOkResponse({ type: SystemNoticeReadUserPageDto })
  listNoticeReadUsers(
    @Param('id') id: string,
    @Query() query: SystemNoticeReadUsersQueryDto,
  ): Promise<SystemNoticeReadUserPageDto> {
    return this.notices.listNoticeReadUsers(id, query);
  }

  @Get('notices/deliveries')
  @ApiTags('Core System Notices')
  @RequirePermission('core:notice:read')
  @ApiOkResponse({ type: SystemNoticeDeliveryPageDto })
  listAllNoticeDeliveries(
    @Query() query: SystemNoticeDeliveryQueryDto,
  ): Promise<SystemNoticeDeliveryPageDto> {
    return this.notices.listAllNoticeDeliveries(query);
  }

  @Get('notices/:id/deliveries')
  @ApiTags('Core System Notices')
  @RequirePermission('core:notice:read')
  @ApiOkResponse({ type: SystemNoticeDeliveryPageDto })
  listNoticeDeliveries(
    @Param('id') id: string,
    @Query() query: SystemNoticeDeliveryQueryDto,
  ): Promise<SystemNoticeDeliveryPageDto> {
    return this.notices.listNoticeDeliveries(id, query);
  }

  @Post('notices/:id/dispatch')
  @ApiTags('Core System Notices')
  @RequirePermission('core:notice:update')
  @ApiOkResponse({ type: SystemNoticeDeliveryMutationResultDto })
  dispatchNotice(
    @Param('id') id: string,
    @Body() body: SystemNoticeDispatchDto = {},
  ): Promise<SystemNoticeDeliveryMutationResultDto> {
    return this.notices.dispatchNotice(id, body);
  }

  @Post('notices/:id/deliveries/execute')
  @ApiTags('Core System Notices')
  @RequirePermission('core:notice:update')
  @ApiOkResponse({ type: SystemNoticeDeliveryExecutionResultDto })
  executeNoticeDeliveries(
    @Param('id') id: string,
    @Body() body: SystemNoticeDeliveryExecuteDto = {},
  ): Promise<SystemNoticeDeliveryExecutionResultDto> {
    return this.notices.executeNoticeDeliveries(id, body);
  }

  @Get('notices/templates')
  @ApiTags('Core System Notices')
  @RequirePermission('core:notice:read')
  @ApiOkResponse({ type: SystemNoticeTemplatePageDto })
  listNoticeTemplates(
    @Query() query: SystemNoticeTemplateQueryDto,
  ): Promise<SystemNoticeTemplatePageDto> {
    return this.notices.listNoticeTemplates(query);
  }

  @Get('notices/templates/simple-list')
  @ApiTags('Core System Notices')
  @RequirePermission('core:notice:read')
  @ApiOkResponse({ type: [SystemNoticeTemplateOptionDto] })
  listNoticeTemplateOptions(): Promise<
    readonly SystemNoticeTemplateOptionDto[]
  > {
    return this.notices.listNoticeTemplateOptions();
  }

  @Get('notices/templates/:code')
  @ApiTags('Core System Notices')
  @RequirePermission('core:notice:read')
  @ApiOkResponse({ type: SystemNoticeTemplateDto })
  getNoticeTemplate(
    @Param('code') code: string,
  ): Promise<SystemNoticeTemplateDto> {
    return this.notices.getNoticeTemplate(code);
  }

  @Post('notices/templates/:code/render')
  @ApiTags('Core System Notices')
  @RequirePermission('core:notice:read')
  @ApiOkResponse({ type: SystemNoticeTemplateRenderDto })
  renderNoticeTemplate(
    @Param('code') code: string,
    @Body() body: RenderSystemNoticeTemplateDto,
  ): Promise<SystemNoticeTemplateRenderDto> {
    return this.notices.renderNoticeTemplate(code, body);
  }

  @Post('notices/templates/:code/create-notice')
  @ApiTags('Core System Notices')
  @RequirePermission('core:notice:create')
  @ApiOkResponse({ type: SystemNoticeDto })
  createNoticeFromTemplate(
    @Param('code') code: string,
    @Body() body: CreateSystemNoticeFromTemplateDto,
  ): Promise<SystemNoticeDto> {
    return this.notices.createNoticeFromTemplate(code, body);
  }

  @Post('notices/templates/:code/test-send')
  @ApiTags('Core System Notices')
  @RequirePermission('core:notice:create')
  @ApiOkResponse({ type: SystemNoticeTemplateTestSendResultDto })
  testSendNoticeTemplate(
    @Param('code') code: string,
    @Body() body: TestSystemNoticeTemplateDto,
  ): Promise<SystemNoticeTemplateTestSendResultDto> {
    return this.notices.testSendNoticeTemplate(code, body);
  }

  @Post('notices/templates')
  @ApiTags('Core System Notices')
  @RequirePermission('core:notice:create')
  @ApiOkResponse({ type: SystemNoticeTemplateDto })
  createNoticeTemplate(
    @Body() body: CreateSystemNoticeTemplateDto,
  ): Promise<SystemNoticeTemplateDto> {
    return this.notices.createNoticeTemplate(body);
  }

  @Patch('notices/templates/:code')
  @ApiTags('Core System Notices')
  @RequirePermission('core:notice:update')
  @ApiOkResponse({ type: SystemNoticeTemplateDto })
  updateNoticeTemplate(
    @Param('code') code: string,
    @Body() body: UpdateSystemNoticeTemplateDto,
  ): Promise<SystemNoticeTemplateDto> {
    return this.notices.updateNoticeTemplate(code, body);
  }

  @Delete('notices/templates/:code')
  @ApiTags('Core System Notices')
  @RequirePermission('core:notice:delete')
  @ApiOkResponse({ type: DeleteResultDto })
  deleteNoticeTemplate(@Param('code') code: string): Promise<DeleteResultDto> {
    return this.notices.deleteNoticeTemplate(code);
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

  @Get('depts/simple-list')
  @ApiTags('Core Departments')
  @ApiOkResponse({ type: [SystemDeptOptionDto] })
  listDeptOptions(): Promise<readonly SystemDeptOptionDto[]> {
    return this.depts.listDeptOptions();
  }

  @Patch('depts/order')
  @ApiTags('Core Departments')
  @RequirePermission('core:dept:update')
  @ApiOkResponse({ type: SystemDeptOrderMutationResultDto })
  updateDeptOrder(
    @Body() body: UpdateSystemDeptOrderDto,
  ): Promise<SystemDeptOrderMutationResultDto> {
    return this.depts.updateDeptOrder(body);
  }

  @Get('depts/:id')
  @ApiTags('Core Departments')
  @RequirePermission('core:dept:read')
  @ApiOkResponse({ type: SystemDeptDto })
  getDept(@Param('id') id: string): Promise<SystemDeptDto> {
    return this.depts.getDept(id);
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

  @Get('posts/simple-list')
  @ApiTags('Core Posts')
  @ApiOkResponse({ type: [SystemPostOptionDto] })
  listPostOptions(): Promise<readonly SystemPostOptionDto[]> {
    return this.posts.listPostOptions();
  }

  @Delete('posts/batch')
  @ApiTags('Core Posts')
  @RequirePermission('core:post:delete')
  @ApiOkResponse({ type: SystemPostBatchMutationResultDto })
  deletePosts(
    @Body() body: BatchDeleteSystemPostsDto,
  ): Promise<SystemPostBatchMutationResultDto> {
    return this.posts.deletePosts(body);
  }

  @Patch('posts/order')
  @ApiTags('Core Posts')
  @RequirePermission('core:post:update')
  @ApiOkResponse({ type: SystemPostOrderMutationResultDto })
  updatePostOrder(
    @Body() body: UpdateSystemPostOrderDto,
  ): Promise<SystemPostOrderMutationResultDto> {
    return this.posts.updatePostOrder(body);
  }

  @Get('posts/:code')
  @ApiTags('Core Posts')
  @RequirePermission('core:post:read')
  @ApiOkResponse({ type: SystemPostDto })
  getPost(@Param('code') code: string): Promise<SystemPostDto> {
    return this.posts.getPost(code);
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

  @Get('files/:id/download')
  @ApiTags('Core Files')
  @ApiProduces('application/octet-stream')
  @RequirePermission('core:file:read')
  @ApiOkResponse({ description: 'Stored file object bytes.' })
  async downloadFile(
    @Param('id') id: string,
    @Res() response: DownloadResponse,
  ): Promise<void> {
    const file = await this.repository.getFile(id);
    const object = await this.files.getObject(file.storageKey);

    if (!object) {
      throw systemManagementNotFound(
        'SYSTEM_FILE_OBJECT_NOT_FOUND',
        'Stored file object is missing.',
        { id, storageKey: file.storageKey },
      );
    }

    response.set({
      'Content-Disposition': createAttachmentDisposition(file.originalName),
      'Content-Length': String(object.byteLength),
      'Content-Type': file.mimeType,
      'X-OpenCore-Storage-Key': file.storageKey,
    });

    response.send(object);
  }

  @Get('files/:id')
  @ApiTags('Core Files')
  @RequirePermission('core:file:read')
  @ApiOkResponse({ type: FileAssetDto })
  getFile(@Param('id') id: string): Promise<FileAssetDto> {
    return this.repository.getFile(id);
  }

  @Post('files')
  @ApiTags('Core Files')
  @RequirePermission('core:file:create')
  @ApiOkResponse({ type: FileAssetDto })
  createFileAsset(@Body() body: CreateFileAssetDto): Promise<FileAssetDto> {
    return this.repository.createFileAsset(body);
  }

  @Post('files/upload')
  @ApiTags('Core Files')
  @RequirePermission('core:file:create')
  @ApiOkResponse({ type: FileAssetDto })
  async uploadFileAsset(
    @Body() body: UploadFileAssetDto,
  ): Promise<FileAssetDto> {
    const content = decodeBase64FileContent(body.contentBase64);
    const file = await this.repository.createFileAsset({
      checksum: body.checksum,
      mimeType: body.mimeType,
      originalName: body.originalName,
      sizeBytes: content.byteLength,
      uploadedBy: body.uploadedBy,
    });

    try {
      await this.files.storeObjectAtKey({
        key: file.storageKey,
        body: content,
        contentType: file.mimeType,
        checksum: file.checksum,
        uploadedBy: file.uploadedBy,
      });
    } catch (error) {
      await this.repository.deleteFile(file.id).catch(() => undefined);
      throw error;
    }

    return file;
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
  async deleteFile(@Param('id') id: string): Promise<DeleteResultDto> {
    const file = await this.repository.getFile(id);
    await this.files.deleteObject(file.storageKey);
    return this.repository.deleteFile(id);
  }

  @Get('ip-location/status')
  @ApiTags('Core IP Location')
  @RequirePermission('core:login-log:read')
  @ApiOkResponse({ type: IpLocationProviderStatusDto })
  getIpLocationProviderStatus(): IpLocationProviderStatusDto {
    return this.ipLocationProvider.getStatus();
  }

  @Get('ip-location/lookup')
  @ApiTags('Core IP Location')
  @RequirePermission('core:login-log:read')
  @ApiOkResponse({ type: IpLocationLookupDto })
  async lookupIpLocation(
    @Query() query: IpLocationLookupQueryDto,
  ): Promise<IpLocationLookupDto> {
    if (!query.ip?.trim()) {
      throw systemManagementBadRequest(
        'SYSTEM_IP_ADDRESS_REQUIRED',
        'IP address is required.',
        { field: 'ip' },
      );
    }

    return this.ipLocationProvider.lookup(query.ip);
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

  @Delete('audit-logs/batch')
  @ApiTags('Core Audit Logs')
  @RequirePermission('core:audit-log:delete')
  @ApiOkResponse({ type: AuditLogBatchMutationResultDto })
  deleteAuditLogs(
    @Body() body: BatchDeleteAuditLogsDto,
  ): Promise<AuditLogBatchMutationResultDto> {
    return this.operationLogs.deleteOperationLogs(body);
  }

  @Delete('audit-logs/clean')
  @ApiTags('Core Audit Logs')
  @RequirePermission('core:audit-log:delete')
  @ApiOkResponse({ type: AuditLogCleanResultDto })
  cleanAuditLogs(
    @Query() query: CleanAuditLogsDto,
  ): Promise<AuditLogCleanResultDto> {
    return this.operationLogs.cleanOperationLogs(query);
  }

  @Get('audit-logs/:id')
  @ApiTags('Core Audit Logs')
  @RequirePermission('core:audit-log:read')
  @ApiOkResponse({ type: AuditLogDto })
  getAuditLog(@Param('id') id: string): Promise<AuditLogDto> {
    return this.operationLogs.getOperationLog(id);
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

  @Delete('login-logs/batch')
  @ApiTags('Core Login Logs')
  @RequirePermission('core:login-log:delete')
  @ApiOkResponse({ type: LoginLogBatchMutationResultDto })
  deleteLoginLogs(
    @Body() body: BatchDeleteLoginLogsDto,
  ): Promise<LoginLogBatchMutationResultDto> {
    return this.loginLogs.deleteLoginLogs(body);
  }

  @Delete('login-logs/clean')
  @ApiTags('Core Login Logs')
  @RequirePermission('core:login-log:delete')
  @ApiOkResponse({ type: LoginLogCleanResultDto })
  cleanLoginLogs(): Promise<LoginLogCleanResultDto> {
    return this.loginLogs.cleanLoginLogs();
  }

  @Post('login-logs/unlock')
  @ApiTags('Core Login Logs')
  @RequirePermission('core:login-log:manage')
  @ApiOkResponse({ type: LoginUnlockResultDto })
  unlockLoginUser(
    @Body() body: UnlockLoginUserDto,
  ): Promise<LoginUnlockResultDto> {
    return this.loginLockouts.clearLoginLockout(body.username);
  }

  @Get('login-logs/:id')
  @ApiTags('Core Login Logs')
  @RequirePermission('core:login-log:read')
  @ApiOkResponse({ type: LoginLogDto })
  getLoginLog(@Param('id') id: string): Promise<LoginLogDto> {
    return this.loginLogs.getLoginLog(id);
  }
}

function getAuthenticatedUserId(request: RequestWithUser): string {
  const userId = request.user?.id;

  if (!userId) {
    throw systemManagementUnauthorized(
      'SYSTEM_AUTH_USER_REQUIRED',
      'Missing authenticated user.',
    );
  }

  return userId;
}

function writeSseEvent(
  response: SseResponse,
  event: SystemNoticeRealtimeEvent,
): void {
  response.write(`id: ${event.id}\n`);
  response.write(`event: ${event.type}\n`);
  response.write(`data: ${JSON.stringify(event)}\n\n`);
}

function getCloseableRequest(request: RequestWithUser): {
  on(event: 'close', listener: () => void): void;
} {
  return request as RequestWithUser & {
    on(event: 'close', listener: () => void): void;
  };
}

function decodeBase64FileContent(contentBase64: string): Buffer {
  const payload = contentBase64.includes(',')
    ? contentBase64.slice(contentBase64.indexOf(',') + 1)
    : contentBase64;
  const normalized = payload.trim().replace(/\s/g, '');

  if (!normalized || !/^[A-Za-z0-9+/]+={0,2}$/.test(normalized)) {
    throw systemManagementBadRequest(
      'SYSTEM_FILE_CONTENT_BASE64_INVALID',
      'File content must be valid base64.',
      { field: 'contentBase64' },
    );
  }

  const content = Buffer.from(normalized, 'base64');

  if (content.byteLength === 0) {
    throw systemManagementBadRequest(
      'SYSTEM_FILE_CONTENT_EMPTY',
      'File content must not be empty.',
      { field: 'contentBase64' },
    );
  }

  return content;
}

function createAttachmentDisposition(fileName: string): string {
  const fallbackName = fileName.replace(/[^\x20-\x7e]|["\\]/g, '_') || 'file';

  return `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodeURIComponent(
    fileName,
  )}`;
}
