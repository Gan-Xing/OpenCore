import type { SdkRequest } from './rbac-client';
import { createCrmClient, type CrmClient } from './crm-client';
import type {
  BusinessExportPreview,
  BusinessExportQueryRequest,
} from './business-core-types';

export type BusinessCoreClient = Omit<CrmClient, 'exportCrm'> & {
  exportBusinessCore: (
    token: string,
    query: BusinessExportQueryRequest,
  ) => Promise<BusinessExportPreview>;
};

export function createBusinessCoreClient(
  request: SdkRequest,
): BusinessCoreClient {
  const client = createCrmClient(request);
  const { exportCrm: _exportCrm, ...sharedClient } = client;

  return {
    ...sharedClient,
    exportBusinessCore: (token, query) => client.exportCrm(token, query),
  };
}
