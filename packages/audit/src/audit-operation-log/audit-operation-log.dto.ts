import { ApiProperty } from '@nestjs/swagger';

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
  location!: string;

  @ApiProperty()
  userAgent!: string;

  @ApiProperty()
  requestId!: string;

  @ApiProperty()
  durationMs!: number;

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

export class AuditLogQueryDto {
  @ApiProperty({ required: false, default: 1 })
  page?: number | string;

  @ApiProperty({ required: false, default: 10 })
  pageSize?: number | string;

  @ApiProperty({ required: false })
  actorUsername?: string;

  @ApiProperty({ required: false })
  action?: string;

  @ApiProperty({ required: false })
  resource?: string;

  @ApiProperty({ required: false })
  location?: string;

  @ApiProperty({ required: false, enum: ['error', 'success'] })
  status?: 'error' | 'success';

  @ApiProperty({ required: false })
  createdFrom?: string;

  @ApiProperty({ required: false })
  createdTo?: string;

  @ApiProperty({ required: false })
  minDurationMs?: number | string;

  @ApiProperty({ required: false })
  maxDurationMs?: number | string;
}

export class BatchDeleteAuditLogsDto {
  @ApiProperty({ type: [String] })
  ids!: readonly string[];
}

export class AuditLogBatchMutationResultDto {
  @ApiProperty()
  deleted!: true;

  @ApiProperty()
  affected!: number;

  @ApiProperty({ type: [String] })
  ids!: readonly string[];
}

export class AuditLogCleanResultDto {
  @ApiProperty()
  deleted!: true;

  @ApiProperty()
  affected!: number;

  @ApiProperty()
  retentionDays!: number;

  @ApiProperty()
  cutoffBefore!: string;
}

export class CleanAuditLogsDto {
  @ApiProperty({ required: false, default: 90 })
  retentionDays?: number | string;
}
