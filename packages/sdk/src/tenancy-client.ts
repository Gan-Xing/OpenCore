import type { SdkRequest } from './rbac-client';
import type {
  CreateTenantPlanRequest,
  CreateTenantRequest,
  SetTenantStatusRequest,
  TenancyFoundationSummary,
  TenantMemberSummary,
  TenantPlanDeleteResultSummary,
  TenantPlanSummary,
  TenantSummary,
  UpdateTenantPlanRequest,
  UpdateTenantRequest,
  UpdateTenantMemberAssignmentsRequest,
} from './tenancy-types';

export type TenancyClient = {
  getFoundationSummary: (token: string) => Promise<TenancyFoundationSummary>;
  listTenants: (token: string) => Promise<readonly TenantSummary[]>;
  getTenant: (token: string, tenantId: string) => Promise<TenantSummary>;
  createTenant: (
    token: string,
    body: CreateTenantRequest,
  ) => Promise<TenantSummary>;
  updateTenant: (
    token: string,
    tenantId: string,
    body: UpdateTenantRequest,
  ) => Promise<TenantSummary>;
  setTenantStatus: (
    token: string,
    tenantId: string,
    body: SetTenantStatusRequest,
  ) => Promise<TenantSummary>;
  listTenantPlans: (token: string) => Promise<readonly TenantPlanSummary[]>;
  getTenantPlan: (token: string, planId: string) => Promise<TenantPlanSummary>;
  createTenantPlan: (
    token: string,
    body: CreateTenantPlanRequest,
  ) => Promise<TenantPlanSummary>;
  updateTenantPlan: (
    token: string,
    planId: string,
    body: UpdateTenantPlanRequest,
  ) => Promise<TenantPlanSummary>;
  deleteTenantPlan: (
    token: string,
    planId: string,
  ) => Promise<TenantPlanDeleteResultSummary>;
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
    listTenants: (token) =>
      request<readonly TenantSummary[]>('/core/tenancy/tenants', {
        token,
      }),
    getTenant: (token, tenantId) =>
      request<TenantSummary>(
        `/core/tenancy/tenants/${encodeURIComponent(tenantId)}`,
        { token },
      ),
    createTenant: (token, body) =>
      request<TenantSummary>('/core/tenancy/tenants', {
        method: 'POST',
        body,
        token,
      }),
    updateTenant: (token, tenantId, body) =>
      request<TenantSummary>(
        `/core/tenancy/tenants/${encodeURIComponent(tenantId)}`,
        {
          method: 'PATCH',
          body,
          token,
        },
      ),
    setTenantStatus: (token, tenantId, body) =>
      request<TenantSummary>(
        `/core/tenancy/tenants/${encodeURIComponent(tenantId)}/status`,
        {
          method: 'PATCH',
          body,
          token,
        },
      ),
    listTenantPlans: (token) =>
      request<readonly TenantPlanSummary[]>('/core/tenancy/plans', {
        token,
      }),
    getTenantPlan: (token, planId) =>
      request<TenantPlanSummary>(
        `/core/tenancy/plans/${encodeURIComponent(planId)}`,
        { token },
      ),
    createTenantPlan: (token, body) =>
      request<TenantPlanSummary>('/core/tenancy/plans', {
        method: 'POST',
        body,
        token,
      }),
    updateTenantPlan: (token, planId, body) =>
      request<TenantPlanSummary>(
        `/core/tenancy/plans/${encodeURIComponent(planId)}`,
        {
          method: 'PATCH',
          body,
          token,
        },
      ),
    deleteTenantPlan: (token, planId) =>
      request<TenantPlanDeleteResultSummary>(
        `/core/tenancy/plans/${encodeURIComponent(planId)}`,
        {
          method: 'DELETE',
          token,
        },
      ),
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
