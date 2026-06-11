import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../platform/database/prisma.service';
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
  normalizeOptionalBoolean,
  OperationsRepository,
  requireRecord,
  type CacheClearResult,
  type PageResult,
} from './operations.repository';

type JobDefinitionRow = {
  id: string;
  code: string;
  name: string;
  queueName: string;
  cron: string | null;
  enabled: boolean;
  retryLimit: number;
  timeoutSeconds: number;
  payload: unknown;
};

type JobRunLogRow = {
  id: string;
  jobCode: string;
  status: string;
  trigger: string;
  attempts: number;
  startedAt: Date;
  finishedAt: Date | null;
  error: string | null;
  metadata: unknown;
};

type SessionRow = {
  id: string;
  username: string;
  tokenId: string;
  ip: string;
  userAgent: string;
  lastSeenAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  revokedBy?: string | null;
  revokedReason?: string | null;
};

type ReportRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  querySchema: unknown;
  enabled: boolean;
  owner: string;
};

@Injectable()
export class PrismaOperationsRepository extends OperationsRepository {
  private cacheKeys: CacheKeyRecord[] = seedCacheKeys.map((key) => ({
    ...key,
  }));

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getSummary() {
    const [jobs, jobRuns, onlineSessions, reports] = await Promise.all([
      this.prisma.jobDefinition.findMany(),
      this.prisma.jobRunLog.findMany(),
      this.prisma.onlineUserSession.findMany(),
      this.prisma.reportDefinition.findMany(),
    ]);

    return buildOperationsSummary({
      jobs: jobs.map(toJobDefinitionRecord),
      jobRuns: jobRuns.map(toJobRunLogRecord),
      cacheKeys: this.cacheKeys,
      onlineSessions: onlineSessions.map(toSessionRecord),
      reports: reports.map(toReportRecord),
      exportJobDesign,
    });
  }

  async listJobs(
    query: JobQueryDto = {},
  ): Promise<PageResult<JobDefinitionRecord>> {
    const rows = await this.prisma.jobDefinition.findMany({
      where: {
        enabled: normalizeOptionalBoolean(query.enabled),
        queueName: query.queueName,
      },
      orderBy: [{ code: 'asc' }],
    });

    return createPage(rows.map(toJobDefinitionRecord), query);
  }

  async createJob(body: CreateJobDefinitionDto): Promise<JobDefinitionRecord> {
    const policy = {
      retryLimit: body.retryLimit ?? 3,
      timeoutSeconds: body.timeoutSeconds ?? 60,
    };
    assertSafeJobPolicy(policy);
    const job = await this.prisma.jobDefinition.create({
      data: {
        code: body.code,
        name: body.name,
        queueName: body.queueName,
        cron: body.cron,
        enabled: body.enabled ?? true,
        retryLimit: policy.retryLimit,
        timeoutSeconds: policy.timeoutSeconds,
        payload: body.payload ? toInputJson(body.payload) : undefined,
      },
    });

    return toJobDefinitionRecord(job);
  }

  async getJob(code: string): Promise<JobDefinitionRecord> {
    return this.findJob(code);
  }

  async updateJob(
    code: string,
    body: UpdateJobDefinitionDto,
  ): Promise<JobDefinitionRecord> {
    const existing = await this.findJob(code);
    const policy = {
      retryLimit: body.retryLimit ?? existing.retryLimit,
      timeoutSeconds: body.timeoutSeconds ?? existing.timeoutSeconds,
    };
    assertSafeJobPolicy(policy);
    const job = await this.prisma.jobDefinition.update({
      where: { code },
      data: {
        name: body.name ?? existing.name,
        queueName: body.queueName ?? existing.queueName,
        cron: body.cron ?? existing.cron,
        enabled: body.enabled ?? existing.enabled,
        retryLimit: policy.retryLimit,
        timeoutSeconds: policy.timeoutSeconds,
        payload: body.payload ? toInputJson(body.payload) : undefined,
      },
    });

    return toJobDefinitionRecord(job);
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
    const job = await this.findJob(code);
    assertJobEnabled(job);
    const runSeed = createManualRunLog({
      jobCode: code,
      actor: body.actor,
      metadata: body.metadata,
      index: Date.now(),
    });
    const run = await this.prisma.jobRunLog.create({
      data: {
        jobCode: code,
        status: runSeed.status,
        trigger: runSeed.trigger,
        attempts: runSeed.attempts,
        startedAt: new Date(runSeed.startedAt),
        finishedAt: runSeed.finishedAt ? new Date(runSeed.finishedAt) : null,
        metadata: runSeed.metadata ? toInputJson(runSeed.metadata) : undefined,
      },
    });

    return toJobRunLogRecord(run);
  }

  async listJobRuns(
    code: string,
    query: JobRunQueryDto = {},
  ): Promise<PageResult<JobRunLogRecord>> {
    await this.findJob(code);
    const rows = await this.prisma.jobRunLog.findMany({
      where: { jobCode: code, status: query.status },
      orderBy: [{ startedAt: 'desc' }, { id: 'asc' }],
    });

    return createPage(rows.map(toJobRunLogRecord), query);
  }

  async getJobRun(code: string, id: string): Promise<JobRunLogRecord> {
    await this.findJob(code);
    return requireRecord(
      await this.prisma.jobRunLog
        .findFirst({ where: { id, jobCode: code } })
        .then((run) => (run ? toJobRunLogRecord(run) : undefined)),
      'Job run log',
      id,
    );
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
    const rows = await this.prisma.onlineUserSession.findMany({
      where: {
        revokedAt:
          active === undefined ? undefined : active ? null : { not: null },
      },
      orderBy: [{ lastSeenAt: 'desc' }, { username: 'asc' }],
    });

    return createPage(rows.map(toSessionRecord), query);
  }

  async getOnlineUser(id: string): Promise<OnlineUserSessionRecord> {
    return this.findSession(id);
  }

  async kickOutSession(
    id: string,
    body: KickOutSessionDto,
  ): Promise<OnlineUserSessionRecord> {
    const existing = await this.findSession(id);
    assertSessionActive(existing);
    const session = await this.prisma.onlineUserSession.update({
      where: { id },
      data: { revokedAt: new Date() },
    });

    return {
      ...toSessionRecord(session),
      revokedBy: body.actor,
      revokedReason: body.reason,
    };
  }

  async listReports(
    query: ReportQueryDto = {},
  ): Promise<PageResult<ReportDefinitionRecord>> {
    const enabled = normalizeOptionalBoolean(query.enabled);
    const rows = await this.prisma.reportDefinition.findMany({
      where: { enabled, owner: query.owner },
      orderBy: [{ code: 'asc' }],
    });

    return createPage(rows.map(toReportRecord), query);
  }

  async getReport(code: string): Promise<ReportDefinitionRecord> {
    return this.findReport(code);
  }

  async createReport(
    body: CreateReportDefinitionDto,
  ): Promise<ReportDefinitionRecord> {
    const report = await this.prisma.reportDefinition.create({
      data: {
        code: body.code,
        name: body.name,
        description: body.description,
        querySchema: toInputJson(body.querySchema),
        enabled: body.enabled ?? true,
        owner: body.owner,
      },
    });

    return toReportRecord(report);
  }

  getExportJobDesign(): ExportJobDesignRecord {
    return { ...exportJobDesign };
  }

  private async findJob(code: string): Promise<JobDefinitionRecord> {
    return requireRecord(
      await this.prisma.jobDefinition
        .findUnique({ where: { code } })
        .then((job) => (job ? toJobDefinitionRecord(job) : undefined)),
      'Job definition',
      code,
    );
  }

  private async findSession(id: string): Promise<OnlineUserSessionRecord> {
    return requireRecord(
      await this.prisma.onlineUserSession
        .findUnique({ where: { id } })
        .then((session) => (session ? toSessionRecord(session) : undefined)),
      'Online user session',
      id,
    );
  }

  private async findReport(code: string): Promise<ReportDefinitionRecord> {
    return requireRecord(
      await this.prisma.reportDefinition
        .findUnique({ where: { code } })
        .then((report) => (report ? toReportRecord(report) : undefined)),
      'Report definition',
      code,
    );
  }
}

function toJobDefinitionRecord(row: JobDefinitionRow): JobDefinitionRecord {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    queueName: row.queueName,
    cron: row.cron ?? undefined,
    enabled: row.enabled,
    retryLimit: row.retryLimit,
    timeoutSeconds: row.timeoutSeconds,
    adapter: 'bullmq',
    payload: normalizeRecord(row.payload),
  };
}

function toJobRunLogRecord(row: JobRunLogRow): JobRunLogRecord {
  return {
    id: row.id,
    jobCode: row.jobCode,
    status: normalizeRunStatus(row.status),
    trigger: row.trigger === 'schedule' ? 'schedule' : 'manual',
    attempts: row.attempts,
    startedAt: row.startedAt.toISOString(),
    finishedAt: row.finishedAt?.toISOString(),
    error: row.error ?? undefined,
    metadata: normalizeRecord(row.metadata),
  };
}

function toSessionRecord(row: SessionRow): OnlineUserSessionRecord {
  return {
    id: row.id,
    username: row.username,
    tokenId: row.tokenId,
    ip: row.ip,
    userAgent: row.userAgent,
    lastSeenAt: row.lastSeenAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    revokedAt: row.revokedAt?.toISOString(),
    revokedBy: row.revokedBy ?? undefined,
    revokedReason: row.revokedReason ?? undefined,
  };
}

function toReportRecord(row: ReportRow): ReportDefinitionRecord {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description ?? undefined,
    querySchema: normalizeRecord(row.querySchema) ?? {},
    enabled: row.enabled,
    owner: row.owner,
  };
}

function normalizeRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function normalizeRunStatus(value: string): JobRunLogRecord['status'] {
  return ['queued', 'running', 'completed', 'failed'].includes(value)
    ? (value as JobRunLogRecord['status'])
    : 'queued';
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
