import { ApiProperty } from '@nestjs/swagger';

export class SystemConfigDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  category!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  key!: string;

  @ApiProperty()
  value!: string;

  @ApiProperty({ enum: ['boolean', 'number', 'string'] })
  valueType!: 'boolean' | 'number' | 'string';

  @ApiProperty()
  encrypted!: boolean;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  remark?: string;

  @ApiProperty()
  public!: boolean;

  @ApiProperty()
  system!: boolean;

  @ApiProperty({ enum: ['private', 'public', 'secret'] })
  visibility!: 'private' | 'public' | 'secret';
}

export class SystemConfigValueQueryDto {
  @ApiProperty({ example: 'opencore.admin.title' })
  key!: string;
}

export class SystemConfigValueDto {
  @ApiProperty({ example: 'opencore.admin.title' })
  key!: string;

  @ApiProperty()
  value!: string;

  @ApiProperty({ enum: ['boolean', 'number', 'string'] })
  valueType!: 'boolean' | 'number' | 'string';
}

export class SystemConfigRuntimeDto {
  @ApiProperty({ example: 'OpenCore Admin' })
  adminTitle!: string;

  @ApiProperty({
    additionalProperties: { type: 'boolean' },
    example: { 'notice.inbox': true },
  })
  featureFlags!: Record<string, boolean>;

  @ApiProperty({ example: 15, minimum: 1, maximum: 1440 })
  loginLockoutMinutes!: number;

  @ApiProperty({ example: 5, minimum: 1, maximum: 20 })
  loginMaxFailedAttempts!: number;
}

export class SystemConfigCacheRefreshDto {
  @ApiProperty()
  refreshed!: true;

  @ApiProperty()
  cachedKeys!: number;

  @ApiProperty()
  refreshedAt!: string;
}

export class BatchDeleteSystemConfigsDto {
  @ApiProperty({ type: [String] })
  keys!: readonly string[];
}

export class SystemConfigBatchMutationResultDto {
  @ApiProperty()
  deleted!: true;

  @ApiProperty()
  affected!: number;

  @ApiProperty({ type: [String] })
  keys!: readonly string[];
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
  @ApiProperty({ required: false, example: 'system' })
  category?: string;

  @ApiProperty({ required: false, example: 'Admin title' })
  name?: string;

  @ApiProperty({ example: 'opencore.admin.title' })
  key!: string;

  @ApiProperty()
  value!: string;

  @ApiProperty({ enum: ['boolean', 'number', 'string'] })
  valueType!: 'boolean' | 'number' | 'string';

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  remark?: string;

  @ApiProperty({ required: false, default: false })
  public?: boolean;

  @ApiProperty({ required: false, enum: ['private', 'public', 'secret'] })
  visibility?: 'private' | 'public' | 'secret';
}

export class UpdateSystemConfigDto {
  @ApiProperty({ required: false })
  category?: string;

  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({ required: false })
  value?: string;

  @ApiProperty({ required: false, enum: ['boolean', 'number', 'string'] })
  valueType?: 'boolean' | 'number' | 'string';

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  remark?: string;

  @ApiProperty({ required: false })
  public?: boolean;

  @ApiProperty({ required: false, enum: ['private', 'public', 'secret'] })
  visibility?: 'private' | 'public' | 'secret';
}
