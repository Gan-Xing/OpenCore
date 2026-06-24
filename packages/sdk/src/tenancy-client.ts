import type { SdkRequest } from './rbac-client';
import type {
  CreateTenantMemberRequest,
  CreateTenantPlanRequest,
  CreateTenantRequest,
  SetTenantStatusRequest,
  TenancyFoundationSummary,
  TenantMemberDeleteResultSummary,
  TenantMemberPageSummary,
  TenantMemberQueryRequest,
  TenantMemberSummary,
  TenantPlanDeleteResultSummary,
  TenantPlanPageSummary,
  TenantPlanQueryRequest,
  TenantPlanSummary,
  TenantPageSummary,
  TenantQueryRequest,
  TenantSummary,
  UpdateTenantMemberRequest,
  UpdateTenantPlanRequest,
  UpdateTenantRequest,
  UpdateTenantMemberAssignmentsRequest,
} from './tenancy-types';

export type TenancyClient = {
  getFoundationSummary: (token: string) => Promise<TenancyFoundationSummary>;
  listTenants: (token: string) => Promise<readonly TenantSummary[]>;
  listTenantsPage: (
    token: string,
    query?: TenantQueryRequest,
  ) => Promise<TenantPageSummary>;
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
  listTenantPlansPage: (
    token: string,
    query?: TenantPlanQueryRequest,
  ) => Promise<TenantPlanPageSummary>;
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
  listTenantMembers: (
    token: string,
    tenantId: string,
  ) => Promise<readonly TenantMemberSummary[]>;
  listTenantMembersPage: (
    token: string,
    tenantId: string,
    query?: TenantMemberQueryRequest,
  ) => Promise<TenantMemberPageSummary>;
  createTenantMember: (
    token: string,
    tenantId: string,
    body: CreateTenantMemberRequest,
  ) => Promise<TenantMemberSummary>;
  updateTenantMember: (
    token: string,
    tenantId: string,
    membershipId: string,
    body: UpdateTenantMemberRequest,
  ) => Promise<TenantMemberSummary>;
  removeTenantMember: (
    token: string,
    tenantId: string,
    membershipId: string,
  ) => Promise<TenantMemberDeleteResultSummary>;
  listMembers: (token: string) => Promise<readonly TenantMemberSummary[]>;
  listMembersPage: (
    token: string,
    query?: TenantMemberQueryRequest,
  ) => Promise<TenantMemberPageSummary>;
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
    listTenantsPage: (token, query) =>
      request<TenantPageSummary>(
        withQuery('/core/tenancy/tenants/page', query),
        {
          token,
        },
      ),
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
    listTenantPlansPage: (token, query) =>
      request<TenantPlanPageSummary>(
        withQuery('/core/tenancy/plans/page', query),
        {
          token,
        },
      ),
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
    listTenantMembers: (token, tenantId) =>
      request<readonly TenantMemberSummary[]>(
        `/core/tenancy/tenants/${encodeURIComponent(tenantId)}/members`,
        { token },
      ),
    listTenantMembersPage: (token, tenantId, query) =>
      request<TenantMemberPageSummary>(
        withQuery(
          `/core/tenancy/tenants/${encodeURIComponent(tenantId)}/members/page`,
          query,
        ),
        { token },
      ),
    createTenantMember: (token, tenantId, body) =>
      request<TenantMemberSummary>(
        `/core/tenancy/tenants/${encodeURIComponent(tenantId)}/members`,
        {
          body,
          method: 'POST',
          token,
        },
      ),
    updateTenantMember: (token, tenantId, membershipId, body) =>
      request<TenantMemberSummary>(
        `/core/tenancy/tenants/${encodeURIComponent(tenantId)}/members/${encodeURIComponent(membershipId)}`,
        {
          body,
          method: 'PATCH',
          token,
        },
      ),
    removeTenantMember: (token, tenantId, membershipId) =>
      request<TenantMemberDeleteResultSummary>(
        `/core/tenancy/tenants/${encodeURIComponent(tenantId)}/members/${encodeURIComponent(membershipId)}`,
        {
          method: 'DELETE',
          token,
        },
      ),
    listMembers: (token) =>
      request<readonly TenantMemberSummary[]>('/core/tenancy/members', {
        token,
      }),
    listMembersPage: (token, query) =>
      request<TenantMemberPageSummary>(
        withQuery('/core/tenancy/members/page', query),
        {
          token,
        },
      ),
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

function withQuery(path: `/${string}`, query: object = {}): `/${string}` {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      params.set(key, String(value));
    }
  }

  const queryString = params.toString();
  return queryString ? `${path}?${queryString}` : path;
}
