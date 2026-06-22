import type { SdkRequest } from './rbac-client';
import type { TenancyFoundationSummary } from './tenancy-types';

export type TenancyClient = {
  getFoundationSummary: (token: string) => Promise<TenancyFoundationSummary>;
};

export function createTenancyClient(request: SdkRequest): TenancyClient {
  return {
    getFoundationSummary: (token) =>
      request<TenancyFoundationSummary>('/core/tenancy/foundation', {
        token,
      }),
  };
}
