import { ApiProperty } from '@nestjs/swagger';

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

export class DictItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  value!: string;

  @ApiProperty()
  sort!: number;

  @ApiProperty()
  enabled!: boolean;
}

export class DictTypeDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  enabled!: boolean;

  @ApiProperty({ type: [DictItemDto] })
  items!: readonly DictItemDto[];
}

export class DictTypePageDto {
  @ApiProperty({ type: [DictTypeDto] })
  items!: readonly DictTypeDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class CreateDictTypeDto {
  @ApiProperty({ example: 'system.status' })
  code!: string;

  @ApiProperty({ example: 'System Status' })
  name!: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false, default: true })
  enabled?: boolean;

  @ApiProperty({ required: false, type: [DictItemDto] })
  items?: DictItemDto[];
}

export class UpdateDictTypeDto {
  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  enabled?: boolean;

  @ApiProperty({ required: false, type: [DictItemDto] })
  items?: DictItemDto[];
}

export class SystemConfigDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  key!: string;

  @ApiProperty()
  value!: string;

  @ApiProperty({ enum: ['boolean', 'number', 'string'] })
  valueType!: 'boolean' | 'number' | 'string';

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  public!: boolean;
}

export class SystemConfigPageDto {
  @ApiProperty({ type: [SystemConfigDto] })
  items!: readonly SystemConfigDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class CreateSystemConfigDto {
  @ApiProperty({ example: 'opencore.admin.title' })
  key!: string;

  @ApiProperty()
  value!: string;

  @ApiProperty({ enum: ['boolean', 'number', 'string'] })
  valueType!: 'boolean' | 'number' | 'string';

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false, default: false })
  public?: boolean;
}

export class UpdateSystemConfigDto {
  @ApiProperty({ required: false })
  value?: string;

  @ApiProperty({ required: false, enum: ['boolean', 'number', 'string'] })
  valueType?: 'boolean' | 'number' | 'string';

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  public?: boolean;
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

export class AuditLogDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  actorUsername!: string;

  @ApiProperty()
  action!: string;

  @ApiProperty()
  resource!: string;

  @ApiProperty({ required: false })
  resourceId?: string;

  @ApiProperty()
  method!: string;

  @ApiProperty()
  path!: string;

  @ApiProperty()
  statusCode!: number;

  @ApiProperty()
  ip!: string;

  @ApiProperty()
  userAgent!: string;

  @ApiProperty()
  requestId!: string;

  @ApiProperty({ required: false, type: Object })
  metadata?: unknown;

  @ApiProperty()
  createdAt!: string;
}

export class AuditLogPageDto {
  @ApiProperty({ type: [AuditLogDto] })
  items!: readonly AuditLogDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class LoginLogDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  username!: string;

  @ApiProperty()
  success!: boolean;

  @ApiProperty({ required: false })
  failureReason?: string;

  @ApiProperty()
  ip!: string;

  @ApiProperty()
  userAgent!: string;

  @ApiProperty()
  requestId!: string;

  @ApiProperty()
  createdAt!: string;
}

export class LoginLogPageDto {
  @ApiProperty({ type: [LoginLogDto] })
  items!: readonly LoginLogDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
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
