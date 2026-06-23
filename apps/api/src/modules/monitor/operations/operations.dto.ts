import { ApiProperty } from '@nestjs/swagger';
import { OnlineUserSummaryDto } from '@opencore/online-user';
import { JobDefinitionSummaryDto, JobRunSummaryDto } from '@opencore/scheduler';
import { PageQueryDto } from '../../core/system-management/system-management.dto';

export { PageQueryDto };
export {
  CleanJobRunLogsDto,
  CreateJobDefinitionDto,
  ClaimQueuedJobsDto,
  DispatchDueJobsDto,
  JobDefinitionDto,
  JobDefinitionPageDto,
  JobDefinitionSummaryDto,
  JobQueryDto,
  JobRegistryEntryDto,
  JobRunCleanResultDto,
  JobRunLogDto,
  JobRunLogPageDto,
  JobRunQueryDto,
  JobRunSummaryDto,
  SchedulerDispatchResultDto,
  SchedulerWorkerResultDto,
  TriggerJobDto,
  UpdateJobDefinitionDto,
} from '@opencore/scheduler';
export {
  BatchKickOutSessionsDto,
  BatchKickOutSessionsResultDto,
  CleanExpiredOnlineUserSessionsQueryDto,
  CleanExpiredOnlineUserSessionsResultDto,
  KickOutSessionDto,
  OnlineUserQueryDto,
  OnlineUserSessionDto,
  OnlineUserSessionPageDto,
  OnlineUserSummaryDto,
} from '@opencore/online-user';

export class CacheKeyDto {
  @ApiProperty({ example: 'tenant_root' })
  tenantId!: string;

  @ApiProperty()
  key!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  prefix!: string;

  @ApiProperty()
  ttlSeconds!: number;

  @ApiProperty()
  sizeBytes!: number;

  @ApiProperty()
  type!: string;
}

export class CacheNameDto {
  @ApiProperty({ example: 'tenant_root' })
  tenantId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  prefix!: string;

  @ApiProperty()
  keyCount!: number;

  @ApiProperty()
  totalSizeBytes!: number;

  @ApiProperty()
  expiringKeys!: number;

  @ApiProperty()
  persistentKeys!: number;

  @ApiProperty()
  sampleKey!: string;
}

export class CacheNameListDto {
  @ApiProperty({ type: [CacheNameDto] })
  items!: readonly CacheNameDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  scanLimit!: number;

  @ApiProperty()
  scanComplete!: boolean;
}

export class CacheValueDto extends CacheKeyDto {
  @ApiProperty()
  valuePreview!: string;

  @ApiProperty()
  encoding!: 'string' | 'non-string' | 'missing';

  @ApiProperty()
  sensitive!: boolean;

  @ApiProperty()
  truncated!: boolean;
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

  @ApiProperty()
  scanLimit!: number;

  @ApiProperty()
  scanComplete!: boolean;
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

export class DeleteCacheKeyDto {
  @ApiProperty()
  key!: string;

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

export class CacheKeyDeleteResultDto {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  dryRun!: boolean;

  @ApiProperty()
  existed!: boolean;

  @ApiProperty()
  deleted!: boolean;

  @ApiProperty()
  policy!: string;
}

export class CacheSummaryDto {
  @ApiProperty()
  keyCount!: number;

  @ApiProperty()
  totalSizeBytes!: number;

  @ApiProperty()
  provider!: 'redis';

  @ApiProperty()
  scanLimit!: number;

  @ApiProperty()
  scanComplete!: boolean;
}

export class ReportDefinitionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

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
