import { ApiProperty } from '@nestjs/swagger';
import { PageQueryDto } from '../../core/system-management/system-management.dto';

export { PageQueryDto };

export class JobDefinitionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  queueName!: string;

  @ApiProperty({ required: false })
  cron?: string;

  @ApiProperty()
  enabled!: boolean;

  @ApiProperty()
  retryLimit!: number;

  @ApiProperty()
  timeoutSeconds!: number;

  @ApiProperty()
  adapter!: 'bullmq';

  @ApiProperty({ required: false })
  payload?: Record<string, unknown>;
}

export class JobDefinitionPageDto {
  @ApiProperty({ type: [JobDefinitionDto] })
  items!: readonly JobDefinitionDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class JobQueryDto extends PageQueryDto {
  @ApiProperty({ required: false })
  enabled?: boolean | string;

  @ApiProperty({ required: false })
  queueName?: string;
}

export class CreateJobDefinitionDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  queueName!: string;

  @ApiProperty({ required: false })
  cron?: string;

  @ApiProperty({ required: false, default: true })
  enabled?: boolean;

  @ApiProperty({ required: false, default: 3 })
  retryLimit?: number;

  @ApiProperty({ required: false, default: 60 })
  timeoutSeconds?: number;

  @ApiProperty({ required: false })
  payload?: Record<string, unknown>;
}

export class UpdateJobDefinitionDto {
  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({ required: false })
  queueName?: string;

  @ApiProperty({ required: false })
  cron?: string;

  @ApiProperty({ required: false })
  enabled?: boolean;

  @ApiProperty({ required: false })
  retryLimit?: number;

  @ApiProperty({ required: false })
  timeoutSeconds?: number;

  @ApiProperty({ required: false })
  payload?: Record<string, unknown>;
}

export class TriggerJobDto {
  @ApiProperty()
  actor!: string;

  @ApiProperty({ required: false })
  metadata?: Record<string, unknown>;
}

export class JobRunLogDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  jobCode!: string;

  @ApiProperty({ enum: ['queued', 'running', 'completed', 'failed'] })
  status!: 'queued' | 'running' | 'completed' | 'failed';

  @ApiProperty({ enum: ['manual', 'schedule'] })
  trigger!: 'manual' | 'schedule';

  @ApiProperty()
  attempts!: number;

  @ApiProperty()
  startedAt!: string;

  @ApiProperty({ required: false })
  finishedAt?: string;

  @ApiProperty({ required: false })
  error?: string;

  @ApiProperty({ required: false })
  metadata?: Record<string, unknown>;
}

export class JobRunLogPageDto {
  @ApiProperty({ type: [JobRunLogDto] })
  items!: readonly JobRunLogDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class JobRunQueryDto extends PageQueryDto {
  @ApiProperty({
    enum: ['queued', 'running', 'completed', 'failed'],
    required: false,
  })
  status?: 'queued' | 'running' | 'completed' | 'failed';
}

export class JobDefinitionSummaryDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  enabled!: number;

  @ApiProperty()
  disabled!: number;
}

export class JobRunSummaryDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  queued!: number;

  @ApiProperty()
  running!: number;

  @ApiProperty()
  completed!: number;

  @ApiProperty()
  failed!: number;

  @ApiProperty({ required: false })
  latestStartedAt?: string;
}

export class CacheKeyDto {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  prefix!: string;

  @ApiProperty()
  ttlSeconds!: number;

  @ApiProperty()
  sizeBytes!: number;
}

export class CacheKeyPageDto {
  @ApiProperty({ type: [CacheKeyDto] })
  items!: readonly CacheKeyDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class CacheKeyQueryDto extends PageQueryDto {
  @ApiProperty({ required: false })
  prefix?: string;
}

export class ClearCacheDto {
  @ApiProperty()
  prefix!: string;

  @ApiProperty({ default: true })
  dryRun!: boolean;

  @ApiProperty({ required: false })
  confirmed?: boolean;
}

export class CacheClearResultDto {
  @ApiProperty()
  prefix!: string;

  @ApiProperty()
  dryRun!: boolean;

  @ApiProperty()
  matchedKeys!: number;

  @ApiProperty()
  clearedKeys!: number;

  @ApiProperty()
  policy!: string;
}

export class CacheSummaryDto {
  @ApiProperty()
  keyCount!: number;

  @ApiProperty()
  totalSizeBytes!: number;
}

export class OnlineUserSessionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  username!: string;

  @ApiProperty()
  tokenId!: string;

  @ApiProperty()
  ip!: string;

  @ApiProperty()
  userAgent!: string;

  @ApiProperty()
  lastSeenAt!: string;

  @ApiProperty()
  expiresAt!: string;

  @ApiProperty({ required: false })
  revokedAt?: string;

  @ApiProperty({ required: false })
  revokedBy?: string;

  @ApiProperty({ required: false })
  revokedReason?: string;
}

export class OnlineUserSessionPageDto {
  @ApiProperty({ type: [OnlineUserSessionDto] })
  items!: readonly OnlineUserSessionDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class OnlineUserQueryDto extends PageQueryDto {
  @ApiProperty({ required: false })
  active?: boolean | string;
}

export class KickOutSessionDto {
  @ApiProperty()
  actor!: string;

  @ApiProperty()
  reason!: string;
}

export class OnlineUserSummaryDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  active!: number;

  @ApiProperty()
  revoked!: number;
}

export class ReportDefinitionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  querySchema!: Record<string, unknown>;

  @ApiProperty()
  enabled!: boolean;

  @ApiProperty()
  owner!: string;
}

export class ReportDefinitionPageDto {
  @ApiProperty({ type: [ReportDefinitionDto] })
  items!: readonly ReportDefinitionDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class ReportQueryDto extends PageQueryDto {
  @ApiProperty({ required: false })
  enabled?: boolean | string;

  @ApiProperty({ required: false })
  owner?: string;
}

export class CreateReportDefinitionDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  querySchema!: Record<string, unknown>;

  @ApiProperty({ required: false, default: true })
  enabled?: boolean;

  @ApiProperty()
  owner!: string;
}

export class ReportSummaryDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  enabled!: number;

  @ApiProperty()
  disabled!: number;
}

export class ExportJobDesignDto {
  @ApiProperty()
  resource!: string;

  @ApiProperty()
  status!: 'design-only';

  @ApiProperty({ type: [String] })
  requiredBindings!: readonly string[];

  @ApiProperty({ type: [String] })
  safetyChecks!: readonly string[];

  @ApiProperty()
  runbook!: string;
}

export class OperationsSummaryDto {
  @ApiProperty({ type: JobDefinitionSummaryDto })
  jobs!: JobDefinitionSummaryDto;

  @ApiProperty({ type: JobRunSummaryDto })
  jobRuns!: JobRunSummaryDto;

  @ApiProperty({ type: CacheSummaryDto })
  cache!: CacheSummaryDto;

  @ApiProperty({ type: OnlineUserSummaryDto })
  onlineUsers!: OnlineUserSummaryDto;

  @ApiProperty({ type: ReportSummaryDto })
  reports!: ReportSummaryDto;

  @ApiProperty()
  exportJobStatus!: 'design-only';
}
