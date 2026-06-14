import type { SdkRequest } from './rbac-client';
import type {
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
