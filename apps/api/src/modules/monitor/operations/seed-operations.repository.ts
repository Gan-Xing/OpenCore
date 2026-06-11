import { Injectable } from '@nestjs/common';
import type {
  CacheKeyQueryDto,
  ClearCacheDto,
  CreateJobDefinitionDto,
  CreateReportDefinitionDto,
  KickOutSessionDto,
  JobQueryDto,
  JobRunQueryDto,
  OnlineUserQueryDto,
  ReportQueryDto,
  TriggerJobDto,
  UpdateJobDefinitionDto,
} from './operations.dto';
import {
  exportJobDesign,
  seedCacheKeys,
  seedJobRuns,
  seedJobs,
  seedOnlineSessions,
  seedReports,
  type CacheKeyRecord,
  type ExportJobDesignRecord,
  type JobDefinitionRecord,
  type JobRunLogRecord,
  type OnlineUserSessionRecord,
  type ReportDefinitionRecord,
} from './operations.seed';
import {
  applyCacheClearPolicy,
  assertJobEnabled,
  assertSafeJobPolicy,
  assertSessionActive,
  buildOperationsSummary,
  createManualRunLog,
  createPage,
  matchesOptional,
  normalizeOptionalBoolean,
  OperationsRepository,
  requireRecord,
  type CacheClearResult,
  type PageResult,
} from './operations.repository';

@Injectable()
export class SeedOperationsRepository extends OperationsRepository {
  private jobs: JobDefinitionRecord[] = seedJobs.map((job) => ({ ...job }));
  private jobRuns: JobRunLogRecord[] = seedJobRuns.map((run) => ({ ...run }));
  private cacheKeys: CacheKeyRecord[] = seedCacheKeys.map((key) => ({
    ...key,
  }));
  private onlineSessions: OnlineUserSessionRecord[] = seedOnlineSessions.map(
    (session) => ({ ...session }),
  );
  private reports: ReportDefinitionRecord[] = seedReports.map((report) => ({
    ...report,
  }));

  async getSummary() {
    return buildOperationsSummary({
      jobs: this.jobs,
      jobRuns: this.jobRuns,
      cacheKeys: this.cacheKeys,
      onlineSessions: this.onlineSessions,
      reports: this.reports,
      exportJobDesign,
    });
  }

  async listJobs(
    query: JobQueryDto = {},
  ): Promise<PageResult<JobDefinitionRecord>> {
    const enabled = normalizeOptionalBoolean(query.enabled);
    return createPage(
      this.jobs.filter(
        (job) =>
          matchesOptional(job.enabled, enabled) &&
          matchesOptional(job.queueName, query.queueName),
      ),
      query,
    );
  }

  async createJob(body: CreateJobDefinitionDto): Promise<JobDefinitionRecord> {
    const job: JobDefinitionRecord = {
      id: `job_${body.code.replace(/[^a-zA-Z0-9]+/g, '_')}`,
      code: body.code,
      name: body.name,
      queueName: body.queueName,
      cron: body.cron,
      enabled: body.enabled ?? true,
      retryLimit: body.retryLimit ?? 3,
      timeoutSeconds: body.timeoutSeconds ?? 60,
      adapter: 'bullmq',
      payload: body.payload,
    };
    assertSafeJobPolicy(job);
    this.jobs = [job, ...this.jobs];
    return { ...job };
  }

  async getJob(code: string): Promise<JobDefinitionRecord> {
    return { ...this.findJob(code) };
  }

  async updateJob(
    code: string,
    body: UpdateJobDefinitionDto,
  ): Promise<JobDefinitionRecord> {
    const job = this.findJob(code);
    Object.assign(job, {
      name: body.name ?? job.name,
      queueName: body.queueName ?? job.queueName,
      cron: body.cron ?? job.cron,
      enabled: body.enabled ?? job.enabled,
      retryLimit: body.retryLimit ?? job.retryLimit,
      timeoutSeconds: body.timeoutSeconds ?? job.timeoutSeconds,
      payload: body.payload ?? job.payload,
    });
    assertSafeJobPolicy(job);
    return { ...job };
  }

  async enableJob(code: string): Promise<JobDefinitionRecord> {
    return this.updateJob(code, { enabled: true });
  }

  async disableJob(code: string): Promise<JobDefinitionRecord> {
    return this.updateJob(code, { enabled: false });
  }

  async triggerJob(
    code: string,
    body: TriggerJobDto,
  ): Promise<JobRunLogRecord> {
    const job = this.findJob(code);
    assertJobEnabled(job);
    const run = createManualRunLog({
      jobCode: code,
      actor: body.actor,
      metadata: body.metadata,
      index: this.jobRuns.length + 1,
    });
    this.jobRuns = [run, ...this.jobRuns];
    return { ...run };
  }

  async listJobRuns(
    code: string,
    query: JobRunQueryDto = {},
  ): Promise<PageResult<JobRunLogRecord>> {
    this.findJob(code);
    return createPage(
      this.jobRuns.filter(
        (run) =>
          run.jobCode === code && matchesOptional(run.status, query.status),
      ),
      query,
    );
  }

  async getJobRun(code: string, id: string): Promise<JobRunLogRecord> {
    this.findJob(code);
    return {
      ...requireRecord(
        this.jobRuns.find((run) => run.jobCode === code && run.id === id),
        'Job run log',
        id,
      ),
    };
  }

  async listCacheKeys(
    query: CacheKeyQueryDto = {},
  ): Promise<PageResult<CacheKeyRecord>> {
    return createPage(
      this.cacheKeys.filter((key) =>
        query.prefix ? key.key.startsWith(query.prefix) : true,
      ),
      query,
    );
  }

  async clearCache(body: ClearCacheDto): Promise<CacheClearResult> {
    const result = applyCacheClearPolicy(this.cacheKeys, body);

    if (!result.dryRun) {
      this.cacheKeys = this.cacheKeys.filter(
        (key) => !key.key.startsWith(result.prefix),
      );
    }

    return result;
  }

  async listOnlineUsers(
    query: OnlineUserQueryDto = {},
  ): Promise<PageResult<OnlineUserSessionRecord>> {
    const active = normalizeOptionalBoolean(query.active);
    return createPage(
      this.onlineSessions.filter((session) =>
        active === undefined
          ? true
          : active
            ? !session.revokedAt
            : Boolean(session.revokedAt),
      ),
      query,
    );
  }

  async getOnlineUser(id: string): Promise<OnlineUserSessionRecord> {
    return { ...this.findSession(id) };
  }

  async kickOutSession(
    id: string,
    body: KickOutSessionDto,
  ): Promise<OnlineUserSessionRecord> {
    const session = this.findSession(id);
    assertSessionActive(session);
    session.revokedAt = new Date().toISOString();
    session.revokedBy = body.actor;
    session.revokedReason = body.reason;
    return { ...session };
  }

  async listReports(
    query: ReportQueryDto = {},
  ): Promise<PageResult<ReportDefinitionRecord>> {
    const enabled = normalizeOptionalBoolean(query.enabled);
    return createPage(
      this.reports.filter(
        (report) =>
          matchesOptional(report.enabled, enabled) &&
          matchesOptional(report.owner, query.owner),
      ),
      query,
    );
  }

  async getReport(code: string): Promise<ReportDefinitionRecord> {
    return { ...this.findReport(code) };
  }

  async createReport(
    body: CreateReportDefinitionDto,
  ): Promise<ReportDefinitionRecord> {
    const report: ReportDefinitionRecord = {
      id: `report_${body.code.replace(/[^a-zA-Z0-9]+/g, '_')}`,
      code: body.code,
      name: body.name,
      description: body.description,
      querySchema: body.querySchema,
      enabled: body.enabled ?? true,
      owner: body.owner,
    };
    this.reports = [report, ...this.reports];
    return { ...report };
  }

  getExportJobDesign(): ExportJobDesignRecord {
    return { ...exportJobDesign };
  }

  private findJob(code: string): JobDefinitionRecord {
    return requireRecord(
      this.jobs.find((job) => job.code === code),
      'Job definition',
      code,
    );
  }

  private findSession(id: string): OnlineUserSessionRecord {
    return requireRecord(
      this.onlineSessions.find((session) => session.id === id),
      'Online user session',
      id,
    );
  }

  private findReport(code: string): ReportDefinitionRecord {
    return requireRecord(
      this.reports.find((report) => report.code === code),
      'Report definition',
      code,
    );
  }
}
