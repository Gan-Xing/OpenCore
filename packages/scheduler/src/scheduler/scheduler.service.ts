import { Injectable } from '@nestjs/common';
import type { PageResult } from '@opencore/common';
import type {
  CleanJobRunLogsDto,
  CreateJobDefinitionDto,
  ClaimQueuedJobsDto,
  DispatchDueJobsDto,
  JobRunCleanResultDto,
  JobQueryDto,
  JobRunQueryDto,
  SchedulerDispatchResultDto,
  SchedulerSummaryDto,
  SchedulerWorkerResultDto,
  TriggerJobDto,
  UpdateJobDefinitionDto,
} from './scheduler.dto';
import type {
  SchedulerJobDefinitionRecord,
  SchedulerJobRegistryEntry,
  SchedulerJobRunLogRecord,
} from './scheduler.records';
import { listSchedulerJobRegistry } from './scheduler.records';
import { SchedulerRepository } from './scheduler.repository';

@Injectable()
export class SchedulerService {
  constructor(private readonly repository: SchedulerRepository) {}

  getSummary(): Promise<SchedulerSummaryDto> {
    return this.repository.getSummary();
  }

  listJobs(
    query: JobQueryDto = {},
  ): Promise<PageResult<SchedulerJobDefinitionRecord>> {
    return this.repository.listJobs(query);
  }

  listRegistryEntries(): readonly SchedulerJobRegistryEntry[] {
    return listSchedulerJobRegistry();
  }

  getJob(code: string): Promise<SchedulerJobDefinitionRecord> {
    return this.repository.getJob(code);
  }

  createJob(
    body: CreateJobDefinitionDto,
  ): Promise<SchedulerJobDefinitionRecord> {
    return this.repository.createJob(body);
  }

  updateJob(
    code: string,
    body: UpdateJobDefinitionDto,
  ): Promise<SchedulerJobDefinitionRecord> {
    return this.repository.updateJob(code, body);
  }

  enableJob(code: string): Promise<SchedulerJobDefinitionRecord> {
    return this.repository.enableJob(code);
  }

  disableJob(code: string): Promise<SchedulerJobDefinitionRecord> {
    return this.repository.disableJob(code);
  }

  triggerJob(
    code: string,
    body: TriggerJobDto,
  ): Promise<SchedulerJobRunLogRecord> {
    return this.repository.triggerJob(code, body);
  }

  dispatchDueJobs(
    body: DispatchDueJobsDto,
  ): Promise<SchedulerDispatchResultDto> {
    return this.repository.dispatchDueJobs(body);
  }

  claimQueuedJobs(body: ClaimQueuedJobsDto): Promise<SchedulerWorkerResultDto> {
    return this.repository.claimQueuedJobs(body);
  }

  listJobRuns(
    code: string,
    query: JobRunQueryDto = {},
  ): Promise<PageResult<SchedulerJobRunLogRecord>> {
    return this.repository.listJobRuns(code, query);
  }

  getJobRun(code: string, id: string): Promise<SchedulerJobRunLogRecord> {
    return this.repository.getJobRun(code, id);
  }

  cleanJobRuns(
    code: string,
    query: CleanJobRunLogsDto = {},
  ): Promise<JobRunCleanResultDto> {
    return this.repository.cleanJobRuns(code, query);
  }
}
