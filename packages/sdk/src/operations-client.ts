import type {
  BatchKickOutSessionsRequest,
  BatchKickOutSessionsResult,
  CacheClearResultSummary,
  CacheKeyPage,
  CacheKeyQueryRequest,
  ClaimQueuedJobsRequest,
  ClearCacheRequest,
  CreateJobDefinitionRequest,
  DispatchDueJobsRequest,
  CreateReportDefinitionRequest,
  ExportJobDesignSummary,
  JobDefinitionPage,
  JobDefinitionSummary,
  JobQueryRequest,
  JobRegistryEntrySummary,
  JobRunLogPage,
  JobRunQueryRequest,
  JobRunLogSummary,
  KickOutSessionRequest,
  OnlineUserSessionPage,
  OnlineUserQueryRequest,
  OnlineUserSessionSummary,
  OperationsSummary,
  PageRequest,
  ReportDefinitionPage,
  ReportQueryRequest,
  ReportDefinitionSummary,
  SchedulerDispatchResultSummary,
  SchedulerWorkerResultSummary,
  TriggerJobRequest,
  UpdateJobDefinitionRequest,
} from './operations-types';
import type { SdkRequest } from './rbac-client';

export type OperationsClient = {
  getSummary: (token: string) => Promise<OperationsSummary>;
  listJobs: (
    token: string,
    query?: JobQueryRequest,
  ) => Promise<JobDefinitionPage>;
  listJobRegistry: (
    token: string,
  ) => Promise<readonly JobRegistryEntrySummary[]>;
  getJob: (token: string, code: string) => Promise<JobDefinitionSummary>;
  createJob: (
    token: string,
    body: CreateJobDefinitionRequest,
  ) => Promise<JobDefinitionSummary>;
  updateJob: (
    token: string,
    code: string,
    body: UpdateJobDefinitionRequest,
  ) => Promise<JobDefinitionSummary>;
  enableJob: (token: string, code: string) => Promise<JobDefinitionSummary>;
  disableJob: (token: string, code: string) => Promise<JobDefinitionSummary>;
  triggerJob: (
    token: string,
    code: string,
    body: TriggerJobRequest,
  ) => Promise<JobRunLogSummary>;
  dispatchDueJobs: (
    token: string,
    body: DispatchDueJobsRequest,
  ) => Promise<SchedulerDispatchResultSummary>;
  claimQueuedJobs: (
    token: string,
    body: ClaimQueuedJobsRequest,
  ) => Promise<SchedulerWorkerResultSummary>;
  listJobRuns: (
    token: string,
    code: string,
    query?: JobRunQueryRequest,
  ) => Promise<JobRunLogPage>;
  getJobRun: (
    token: string,
    code: string,
    id: string,
  ) => Promise<JobRunLogSummary>;
  listCacheKeys: (
    token: string,
    query?: CacheKeyQueryRequest,
  ) => Promise<CacheKeyPage>;
  clearCache: (
    token: string,
    body: ClearCacheRequest,
  ) => Promise<CacheClearResultSummary>;
  listOnlineUsers: (
    token: string,
    query?: OnlineUserQueryRequest,
  ) => Promise<OnlineUserSessionPage>;
  getOnlineUser: (
    token: string,
    id: string,
  ) => Promise<OnlineUserSessionSummary>;
  kickOutSession: (
    token: string,
    id: string,
    body: KickOutSessionRequest,
  ) => Promise<OnlineUserSessionSummary>;
  kickOutSessions: (
    token: string,
    body: BatchKickOutSessionsRequest,
  ) => Promise<BatchKickOutSessionsResult>;
  listReports: (
    token: string,
    query?: ReportQueryRequest,
  ) => Promise<ReportDefinitionPage>;
  getReport: (token: string, code: string) => Promise<ReportDefinitionSummary>;
  createReport: (
    token: string,
    body: CreateReportDefinitionRequest,
  ) => Promise<ReportDefinitionSummary>;
  getExportJobDesign: (token: string) => Promise<ExportJobDesignSummary>;
};

export function createOperationsClient(request: SdkRequest): OperationsClient {
  return {
    getSummary: (token) =>
      request<OperationsSummary>('/monitor/operations/summary', { token }),
    listJobs: (token, query) =>
      request<JobDefinitionPage>(withQuery('/monitor/jobs', query), { token }),
    listJobRegistry: (token) =>
      request<readonly JobRegistryEntrySummary[]>('/monitor/jobs/registry', {
        token,
      }),
    getJob: (token, code) =>
      request<JobDefinitionSummary>(
        `/monitor/jobs/${encodeURIComponent(code)}`,
        { token },
      ),
    createJob: (token, body) =>
      request<JobDefinitionSummary>('/monitor/jobs', {
        method: 'POST',
        body,
        token,
      }),
    updateJob: (token, code, body) =>
      request<JobDefinitionSummary>(
        `/monitor/jobs/${encodeURIComponent(code)}`,
        { method: 'PATCH', body, token },
      ),
    enableJob: (token, code) =>
      request<JobDefinitionSummary>(
        `/monitor/jobs/${encodeURIComponent(code)}/enable`,
        { method: 'PATCH', token },
      ),
    disableJob: (token, code) =>
      request<JobDefinitionSummary>(
        `/monitor/jobs/${encodeURIComponent(code)}/disable`,
        { method: 'PATCH', token },
      ),
    triggerJob: (token, code, body) =>
      request<JobRunLogSummary>(
        `/monitor/jobs/${encodeURIComponent(code)}/trigger`,
        { method: 'POST', body, token },
      ),
    dispatchDueJobs: (token, body) =>
      request<SchedulerDispatchResultSummary>('/monitor/jobs/dispatch-due', {
        method: 'POST',
        body,
        token,
      }),
    claimQueuedJobs: (token, body) =>
      request<SchedulerWorkerResultSummary>('/monitor/jobs/worker/claim', {
        method: 'POST',
        body,
        token,
      }),
    listJobRuns: (token, code, query) =>
      request<JobRunLogPage>(
        withQuery(`/monitor/jobs/${encodeURIComponent(code)}/runs`, query),
        { token },
      ),
    getJobRun: (token, code, id) =>
      request<JobRunLogSummary>(
        `/monitor/jobs/${encodeURIComponent(code)}/runs/${encodeURIComponent(
          id,
        )}`,
        { token },
      ),
    listCacheKeys: (token, query) =>
      request<CacheKeyPage>(withQuery('/monitor/cache', query), { token }),
    clearCache: (token, body) =>
      request<CacheClearResultSummary>('/monitor/cache/clear', {
        method: 'POST',
        body,
        token,
      }),
    listOnlineUsers: (token, query) =>
      request<OnlineUserSessionPage>(
        withQuery('/monitor/online-users', query),
        { token },
      ),
    getOnlineUser: (token, id) =>
      request<OnlineUserSessionSummary>(
        `/monitor/online-users/${encodeURIComponent(id)}`,
        { token },
      ),
    kickOutSession: (token, id, body) =>
      request<OnlineUserSessionSummary>(
        `/monitor/online-users/${encodeURIComponent(id)}/kick-out`,
        { method: 'POST', body, token },
      ),
    kickOutSessions: (token, body) =>
      request<BatchKickOutSessionsResult>('/monitor/online-users/kick-out', {
        method: 'POST',
        body,
        token,
      }),
    listReports: (token, query) =>
      request<ReportDefinitionPage>(withQuery('/optional/reports', query), {
        token,
      }),
    getReport: (token, code) =>
      request<ReportDefinitionSummary>(
        `/optional/reports/${encodeURIComponent(code)}`,
        { token },
      ),
    createReport: (token, body) =>
      request<ReportDefinitionSummary>('/optional/reports', {
        method: 'POST',
        body,
        token,
      }),
    getExportJobDesign: (token) =>
      request<ExportJobDesignSummary>('/optional/export-jobs/design', {
        token,
      }),
  };
}

function withQuery(
  path: `/${string}`,
  query: PageRequest & Record<string, unknown> = {},
): `/${string}` {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      params.set(key, String(value));
    }
  }

  const queryString = params.toString();
  return queryString ? `${path}?${queryString}` : path;
}
