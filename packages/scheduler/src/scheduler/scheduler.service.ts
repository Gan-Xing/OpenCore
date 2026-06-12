import { Injectable } from '@nestjs/common';
import type { PageResult } from '@opencore/common';
import type {
  CreateJobDefinitionDto,
  JobQueryDto,
  JobRunQueryDto,
  SchedulerSummaryDto,
  TriggerJobDto,
  UpdateJobDefinitionDto,
} from './scheduler.dto';
import type {
  SchedulerJobDefinitionRecord,
  SchedulerJobRunLogRecord,
} from './scheduler.records';
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

  listJobRuns(
    code: string,
    query: JobRunQueryDto = {},
  ): Promise<PageResult<SchedulerJobRunLogRecord>> {
    return this.repository.listJobRuns(code, query);
  }

  getJobRun(code: string, id: string): Promise<SchedulerJobRunLogRecord> {
    return this.repository.getJobRun(code, id);
  }
}
