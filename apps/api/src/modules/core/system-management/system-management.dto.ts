import { ApiProperty } from '@nestjs/swagger';
export {
  AuditLogDto,
  AuditLogPageDto,
  AuditLogQueryDto,
  AuditLogBatchMutationResultDto,
  AuditLogCleanResultDto,
  BatchDeleteAuditLogsDto,
  CleanAuditLogsDto,
  BatchDeleteLoginLogsDto,
  LoginLogBatchMutationResultDto,
  LoginLogCleanResultDto,
  LoginLogDto,
  LoginLogPageDto,
  LoginLogQueryDto,
} from '@opencore/audit';
export {
  BatchDeleteSystemConfigsDto,
  BatchDeleteSystemPostsDto,
  CreateDictTypeDto,
  CreateDictItemDto,
  CreateSystemDeptDto,
  CreateSystemConfigDto,
  CreateSystemNoticeDto,
  CreateSystemNoticeFromTemplateDto,
  CreateSystemNoticeTemplateDto,
  CreateSystemPostDto,
  DictDataOptionDto,
  DictDataOptionQueryDto,
  DictItemDto,
  DictTypeDto,
  DictTypePageDto,
  SystemDeptDto,
  SystemDeptOrderMutationResultDto,
  SystemDeptOptionDto,
  SystemDeptQueryDto,
  SystemDeptTreeDto,
  SystemConfigBatchMutationResultDto,
  SystemConfigDto,
  SystemConfigCacheRefreshDto,
  SystemConfigEnvironmentOverrideDto,
  SystemConfigFeatureFlagEvaluationDto,
  SystemConfigFeatureFlagEvaluationQueryDto,
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
  SystemNoticeReadUserPageDto,
  SystemNoticeReadUsersQueryDto,
  SystemNoticeUnreadCountDto,
  SystemPostDto,
  SystemPostBatchMutationResultDto,
  SystemPostOrderMutationResultDto,
  SystemPostOptionDto,
  SystemPostPageDto,
  SystemPostQueryDto,
  UpdateSystemDeptDto,
  UpdateSystemDeptOrderDto,
  UpdateSystemPostOrderDto,
  UpdateDictItemDto,
  UpdateDictTypeDto,
  UpdateSystemConfigDto,
  RotateSystemConfigSecretDto,
  RotateSystemConfigVaultKeyDto,
  UpsertSystemConfigEnvironmentOverrideDto,
  UpdateSystemNoticeDto,
  UpdateSystemNoticeTemplateDto,
  UpdateSystemPostDto,
  MarkSystemNoticesReadDto,
  RenderSystemNoticeTemplateDto,
} from '@opencore/system';

export class PageQueryDto {
  @ApiProperty({ required: false, default: 1 })
  page?: number | string;

  @ApiProperty({ required: false, default: 10 })
  pageSize?: number | string;
}

export class DeleteResultDto {
  @ApiProperty()
  deleted!: true;
}

export class UnlockLoginUserDto {
  @ApiProperty({ example: 'admin' })
  username!: string;
}

export class LoginUnlockResultDto {
  @ApiProperty()
  username!: string;

  @ApiProperty()
  unlocked!: boolean;

  @ApiProperty()
  failedAttempts!: number;

  @ApiProperty({ required: false })
  lockedUntil?: string;
}

export class IpLocationLookupQueryDto {
  @ApiProperty({ example: '203.0.113.8' })
  ip!: string;
}

export class IpLocationLookupDto {
  @ApiProperty({ example: '203.0.113.8' })
  ip!: string;

  @ApiProperty({ example: 'Documentation network' })
  location!: string;

  @ApiProperty({ example: 'Documentation network' })
  category!: string;

  @ApiProperty({
    enum: [
      'documentation',
      'link-local',
      'loopback',
      'private',
      'public',
      'shared',
      'unknown',
    ],
  })
  networkType!:
    | 'documentation'
    | 'link-local'
    | 'loopback'
    | 'private'
    | 'public'
    | 'shared'
    | 'unknown';

  @ApiProperty({ example: 'opencore.builtin' })
  provider!: 'opencore.builtin';

  @ApiProperty({ example: 'builtin-cidr' })
  source!: 'builtin-cidr';

  @ApiProperty({ enum: ['exact', 'none', 'range'] })
  confidence!: 'exact' | 'none' | 'range';

  @ApiProperty()
  enriched!: boolean;

  @ApiProperty({ required: false })
  countryCode?: string;

  @ApiProperty({ required: false })
  region?: string;

  @ApiProperty({ required: false })
  city?: string;
}

export class IpLocationProviderStatusDto {
  @ApiProperty({ example: 'opencore.builtin' })
  provider!: 'opencore.builtin';

  @ApiProperty({ example: 'offline' })
  mode!: 'offline';

  @ApiProperty()
  ready!: true;

  @ApiProperty()
  externalLookupEnabled!: false;

  @ApiProperty({ example: 'builtin-cidr-v1' })
  datasetVersion!: 'builtin-cidr-v1';

  @ApiProperty({
    type: [String],
    example: ['documentation', 'loopback', 'private', 'public'],
  })
  supportedNetworks!: readonly string[];

  @ApiProperty()
  checkedAt!: string;
}

export class FileAssetDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  originalName!: string;

  @ApiProperty()
  mimeType!: string;

  @ApiProperty()
  sizeBytes!: number;

  @ApiProperty()
  storageKey!: string;

  @ApiProperty({ required: false })
  checksum?: string;

  @ApiProperty()
  uploadedBy!: string;

  @ApiProperty()
  createdAt!: string;
}

export class FileAssetPageDto {
  @ApiProperty({ type: [FileAssetDto] })
  items!: readonly FileAssetDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class CreateFileAssetDto {
  @ApiProperty({ example: 'policy.pdf' })
  originalName!: string;

  @ApiProperty({ example: 'application/pdf' })
  mimeType!: string;

  @ApiProperty()
  sizeBytes!: number;

  @ApiProperty({ required: false })
  checksum?: string;

  @ApiProperty({ example: 'admin' })
  uploadedBy!: string;
}

export class UploadFileAssetDto {
  @ApiProperty({ example: 'policy.pdf' })
  originalName!: string;

  @ApiProperty({ example: 'application/pdf' })
  mimeType!: string;

  @ApiProperty({
    description: 'Base64-encoded file content without a data URL prefix.',
  })
  contentBase64!: string;

  @ApiProperty({ required: false })
  checksum?: string;

  @ApiProperty({ example: 'admin' })
  uploadedBy!: string;
}

export class UpdateFileAssetDto {
  @ApiProperty({ required: false })
  originalName?: string;

  @ApiProperty({ required: false })
  mimeType?: string;

  @ApiProperty({ required: false })
  checksum?: string;

  @ApiProperty({ required: false })
  uploadedBy?: string;
}

export class ExportPreviewDto {
  @ApiProperty()
  filename!: string;

  @ApiProperty({ required: false })
  contentType?: string;

  @ApiProperty({ required: false })
  contentBase64?: string;

  @ApiProperty({ example: 'current-page' })
  scope!: 'current-page';

  @ApiProperty({ type: [String] })
  columns!: readonly string[];

  @ApiProperty()
  rowCount!: number;

  @ApiProperty()
  generatedAt!: string;
}
