import type { SdkRequest } from './rbac-client';
import type {
  AreaDatasetActivationResultSummary,
  AreaDatasetImportRequest,
  AreaDatasetImportResultSummary,
  AreaDatasetSummary,
  AreaDatasetVersionListSummary,
  AreaIpLookupRequest,
  AreaIpLookupSummary,
  AreaRegionListSummary,
  AreaRegionQueryRequest,
  AreaRegionSummary,
  CreateExportPreviewRequest,
  CurrentPageExportProtocolSummary,
  ExportPlanSummary,
  OpenForgeApplyDryRunRequest,
  OpenForgeApplyDryRunSummary,
  OpenForgeDiffSummary,
  OpenForgeDoctorSummary,
  OpenForgeManifestDetailSummary,
  OpenForgeManifestListSummary,
  OpenForgeManifestPreviewRequest,
  OpenForgePlanSummary,
  OpenForgePreflightSummary,
  OpenForgeRollbackDryRunRequest,
  OpenForgeRollbackDryRunSummary,
  OpenForgeSchemaRequest,
  OpenForgeStatusSummary,
  OpenApiDriftStatus,
} from './tooling-types';

export type ToolingClient = {
  getOpenApiDriftStatus: (token: string) => Promise<OpenApiDriftStatus>;
  getExportProtocol: (
    token: string,
  ) => Promise<CurrentPageExportProtocolSummary>;
  createExportPreview: (
    token: string,
    body: CreateExportPreviewRequest,
  ) => Promise<ExportPlanSummary>;
  getAreaDatasetStatus: (token: string) => Promise<AreaDatasetSummary>;
  listAreaDatasetVersions: (
    token: string,
  ) => Promise<AreaDatasetVersionListSummary>;
  activateAreaDatasetVersion: (
    token: string,
    version: string,
  ) => Promise<AreaDatasetActivationResultSummary>;
  listAreaRegions: (
    token: string,
    query?: AreaRegionQueryRequest,
  ) => Promise<AreaRegionListSummary>;
  getAreaRegion: (token: string, code: string) => Promise<AreaRegionSummary>;
  lookupAreaIp: (
    token: string,
    body: AreaIpLookupRequest,
  ) => Promise<AreaIpLookupSummary>;
  importAreaDataset: (
    token: string,
    body: AreaDatasetImportRequest,
  ) => Promise<AreaDatasetImportResultSummary>;
  getOpenForgeStatus: (token: string) => Promise<OpenForgeStatusSummary>;
  getOpenForgeDoctor: (token: string) => Promise<OpenForgeDoctorSummary>;
  createOpenForgePlan: (
    token: string,
    body: OpenForgeSchemaRequest,
  ) => Promise<OpenForgePlanSummary>;
  createOpenForgeDiff: (
    token: string,
    body: OpenForgeSchemaRequest,
  ) => Promise<OpenForgeDiffSummary>;
  createOpenForgePreflight: (
    token: string,
    body: OpenForgeSchemaRequest,
  ) => Promise<OpenForgePreflightSummary>;
  createOpenForgeApplyDryRun: (
    token: string,
    body: OpenForgeApplyDryRunRequest,
  ) => Promise<OpenForgeApplyDryRunSummary>;
  listOpenForgeManifests: (
    token: string,
  ) => Promise<OpenForgeManifestListSummary>;
  createOpenForgeManifestPreview: (
    token: string,
    body: OpenForgeManifestPreviewRequest,
  ) => Promise<OpenForgeManifestDetailSummary>;
  getOpenForgeManifest: (
    token: string,
    manifestId: string,
  ) => Promise<OpenForgeManifestDetailSummary>;
  createOpenForgeRollbackDryRun: (
    token: string,
    body: OpenForgeRollbackDryRunRequest,
  ) => Promise<OpenForgeRollbackDryRunSummary>;
};

export function createToolingClient(request: SdkRequest): ToolingClient {
  return {
    getOpenApiDriftStatus: (token) =>
      request<OpenApiDriftStatus>('/tools/openapi/drift', {
        token,
      }),
    getExportProtocol: (token) =>
      request<CurrentPageExportProtocolSummary>('/tools/export/protocol', {
        token,
      }),
    createExportPreview: (token, body) =>
      request<ExportPlanSummary>('/tools/export/preview', {
        method: 'POST',
        body,
        token,
      }),
    getAreaDatasetStatus: (token) =>
      request<AreaDatasetSummary>('/tools/area/dataset', { token }),
    listAreaDatasetVersions: (token) =>
      request<AreaDatasetVersionListSummary>('/tools/area/dataset/versions', {
        token,
      }),
    activateAreaDatasetVersion: (token, version) =>
      request<AreaDatasetActivationResultSummary>(
        `/tools/area/dataset/versions/${encodeURIComponent(version)}/activate`,
        {
          method: 'POST',
          token,
        },
      ),
    listAreaRegions: (token, query = {}) =>
      request<AreaRegionListSummary>(
        `/tools/area/regions${toQueryString(query)}`,
        { token },
      ),
    getAreaRegion: (token, code) =>
      request<AreaRegionSummary>(
        `/tools/area/regions/${encodeURIComponent(code)}`,
        { token },
      ),
    lookupAreaIp: (token, body) =>
      request<AreaIpLookupSummary>('/tools/area/ip/lookup', {
        method: 'POST',
        body,
        token,
      }),
    importAreaDataset: (token, body) =>
      request<AreaDatasetImportResultSummary>('/tools/area/import', {
        method: 'POST',
        body,
        token,
      }),
    getOpenForgeStatus: (token) =>
      request<OpenForgeStatusSummary>('/tools/openforge/status', {
        token,
      }),
    getOpenForgeDoctor: (token) =>
      request<OpenForgeDoctorSummary>('/tools/openforge/doctor', {
        token,
      }),
    createOpenForgePlan: (token, body) =>
      request<OpenForgePlanSummary>('/tools/openforge/plan', {
        method: 'POST',
        body,
        token,
      }),
    createOpenForgeDiff: (token, body) =>
      request<OpenForgeDiffSummary>('/tools/openforge/diff', {
        method: 'POST',
        body,
        token,
      }),
    createOpenForgePreflight: (token, body) =>
      request<OpenForgePreflightSummary>('/tools/openforge/check', {
        method: 'POST',
        body,
        token,
      }),
    createOpenForgeApplyDryRun: (token, body) =>
      request<OpenForgeApplyDryRunSummary>('/tools/openforge/apply/dry-run', {
        method: 'POST',
        body,
        token,
      }),
    listOpenForgeManifests: (token) =>
      request<OpenForgeManifestListSummary>('/tools/openforge/manifests', {
        token,
      }),
    createOpenForgeManifestPreview: (token, body) =>
      request<OpenForgeManifestDetailSummary>(
        '/tools/openforge/manifests/preview',
        {
          method: 'POST',
          body,
          token,
        },
      ),
    getOpenForgeManifest: (token, manifestId) =>
      request<OpenForgeManifestDetailSummary>(
        `/tools/openforge/manifests/${encodeURIComponent(manifestId)}`,
        { token },
      ),
    createOpenForgeRollbackDryRun: (token, body) =>
      request<OpenForgeRollbackDryRunSummary>(
        '/tools/openforge/rollback/dry-run',
        {
          method: 'POST',
          body,
          token,
        },
      ),
  };
}

function toQueryString(query: AreaRegionQueryRequest): string {
  const search = new URLSearchParams();

  if (query.query) {
    search.set('query', query.query);
  }
  if (query.parentCode) {
    search.set('parentCode', query.parentCode);
  }
  if (query.limit !== undefined) {
    search.set('limit', String(query.limit));
  }

  const value = search.toString();
  return value ? `?${value}` : '';
}
