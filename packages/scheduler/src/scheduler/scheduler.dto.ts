import { ApiProperty } from '@nestjs/swagger';

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

export class JobRegistryEntryDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  queueName!: string;

  @ApiProperty()
  handlerKey!: string;

  @ApiProperty()
  allowManualTrigger!: boolean;

  @ApiProperty({ required: false })
  defaultCron?: string;

  @ApiProperty({ required: false })
  defaultPayload?: Record<string, unknown>;
}

export class JobQueryDto {
  @ApiProperty({ required: false, default: 1 })
  page?: number | string;

  @ApiProperty({ required: false, default: 10 })
  pageSize?: number | string;

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

export class DispatchDueJobsDto {
  @ApiProperty()
  actor!: string;

  @ApiProperty({ required: false })
  now?: string;

  @ApiProperty({ required: false })
  queueName?: string;

  @ApiProperty({ required: false, default: 20 })
  limit?: number;

  @ApiProperty({ required: false })
  metadata?: Record<string, unknown>;
}

export class ClaimQueuedJobsDto {
  @ApiProperty()
  actor!: string;

  @ApiProperty({ required: false })
  queueName?: string;

  @ApiProperty({ required: false, default: 20 })
  limit?: number;

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

  @ApiProperty({ required: false })
  durationMs?: number;

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

export class JobRunQueryDto {
  @ApiProperty({ required: false, default: 1 })
  page?: number | string;

  @ApiProperty({ required: false, default: 10 })
  pageSize?: number | string;

  @ApiProperty({
    enum: ['queued', 'running', 'completed', 'failed'],
    required: false,
  })
  status?: 'queued' | 'running' | 'completed' | 'failed';
}

export class CleanJobRunLogsDto {
  @ApiProperty({ required: false, default: 30, type: Number })
  retentionDays?: number | string;

  @ApiProperty({
    enum: ['completed', 'failed'],
    required: false,
  })
  status?: 'completed' | 'failed';
}

export class JobRunCleanResultDto {
  @ApiProperty()
  deleted!: true;

  @ApiProperty()
  jobCode!: string;

  @ApiProperty()
  affected!: number;

  @ApiProperty()
  retentionDays!: number;

  @ApiProperty()
  cutoffBefore!: string;

  @ApiProperty({ enum: ['completed', 'failed'], isArray: true })
  statuses!: readonly ('completed' | 'failed')[];
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

export class SchedulerSummaryDto {
  @ApiProperty({ type: JobDefinitionSummaryDto })
  jobs!: JobDefinitionSummaryDto;

  @ApiProperty({ type: JobRunSummaryDto })
  jobRuns!: JobRunSummaryDto;
}

export class SchedulerDispatchResultDto {
  @ApiProperty()
  checkedAt!: string;

  @ApiProperty()
  dispatchedCount!: number;

  @ApiProperty()
  skippedCount!: number;

  @ApiProperty({ type: [JobRunLogDto] })
  queuedRuns!: readonly JobRunLogDto[];
}

export class SchedulerWorkerResultDto {
  @ApiProperty()
  checkedAt!: string;

  @ApiProperty()
  claimedCount!: number;

  @ApiProperty()
  completedCount!: number;

  @ApiProperty()
  failedCount!: number;

  @ApiProperty()
  skippedCount!: number;

  @ApiProperty({ type: [JobRunLogDto] })
  runs!: readonly JobRunLogDto[];
}
