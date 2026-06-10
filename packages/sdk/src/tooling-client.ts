import type { SdkRequest } from './rbac-client';
import type {
  CreateExportPreviewRequest,
  CurrentPageExportProtocolSummary,
  ExportPlanSummary,
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
  };
}
