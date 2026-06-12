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
}
