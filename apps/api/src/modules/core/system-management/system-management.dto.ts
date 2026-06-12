import { ApiProperty } from '@nestjs/swagger';
export {
  AuditLogDto,
  AuditLogPageDto,
  AuditLogQueryDto,
  LoginLogDto,
  LoginLogPageDto,
  LoginLogQueryDto,
} from '@opencore/audit';
export {
  CreateDictTypeDto,
  CreateDictItemDto,
  CreateSystemDeptDto,
  CreateSystemConfigDto,
  CreateSystemNoticeDto,
  CreateSystemPostDto,
  DictDataOptionDto,
  DictDataOptionQueryDto,
  DictItemDto,
  DictTypeDto,
  DictTypePageDto,
  SystemDeptDto,
  SystemDeptQueryDto,
  SystemDeptTreeDto,
  SystemConfigDto,
  SystemConfigCacheRefreshDto,
  SystemConfigPageDto,
  SystemConfigValueDto,
  SystemConfigValueQueryDto,
  SystemNoticeDto,
  SystemNoticePageDto,
  SystemNoticeQueryDto,
  SystemPostDto,
  SystemPostPageDto,
  SystemPostQueryDto,
  UpdateSystemDeptDto,
  UpdateDictItemDto,
  UpdateDictTypeDto,
  UpdateSystemConfigDto,
  UpdateSystemNoticeDto,
  UpdateSystemPostDto,
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

  @ApiProperty({ example: 'current-page' })
  scope!: 'current-page';

  @ApiProperty({ type: [String] })
  columns!: readonly string[];

  @ApiProperty()
  rowCount!: number;

  @ApiProperty()
  generatedAt!: string;
}
