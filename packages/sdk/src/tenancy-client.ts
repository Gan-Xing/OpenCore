import type { SdkRequest } from './rbac-client';
import type {
  TenancyFoundationSummary,
  TenantMemberSummary,
  UpdateTenantMemberAssignmentsRequest,
} from './tenancy-types';

export type TenancyClient = {
  getFoundationSummary: (token: string) => Promise<TenancyFoundationSummary>;
  listMembers: (token: string) => Promise<readonly TenantMemberSummary[]>;
  updateMemberAssignments: (
    token: string,
    membershipId: string,
    body: UpdateTenantMemberAssignmentsRequest,
  ) => Promise<TenantMemberSummary>;
};

export function createTenancyClient(request: SdkRequest): TenancyClient {
  return {
    getFoundationSummary: (token) =>
      request<TenancyFoundationSummary>('/core/tenancy/foundation', {
        token,
      }),
    listMembers: (token) =>
      request<readonly TenantMemberSummary[]>('/core/tenancy/members', {
        token,
      }),
    updateMemberAssignments: (token, membershipId, body) =>
      request<TenantMemberSummary>(
        `/core/tenancy/members/${encodeURIComponent(membershipId)}/assignments`,
        {
          method: 'PATCH',
          body,
          token,
        },
      ),
  };
}
