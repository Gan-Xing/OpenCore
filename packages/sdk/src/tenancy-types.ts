export type TenancyMode = 'shared' | 'single';

export type TenantPlanFoundationSummary = {
  id: string;
  code: string;
  name: string;
  enabled: boolean;
  limits: unknown;
  moduleCodes: readonly string[];
  tenantCount: number;
  remark?: string | null;
};

export type TenantPlanUsageTenantSummary = {
  id: string;
  code: string;
  name: string;
  status: 'active' | 'expired' | 'suspended' | string;
};

export type TenantPlanSummary = TenantPlanFoundationSummary & {
  tenants: readonly TenantPlanUsageTenantSummary[];
  createdAt: string;
  updatedAt: string;
};

export type CreateTenantPlanRequest = {
  code: string;
  name: string;
  enabled?: boolean;
  remark?: string | null;
  limits?: unknown;
  moduleCodes?: readonly string[];
};

export type UpdateTenantPlanRequest = {
  code?: string;
  name?: string;
  enabled?: boolean;
  remark?: string | null;
  limits?: unknown;
  moduleCodes?: readonly string[];
};

export type TenantPlanDeleteResultSummary = {
  deleted: true;
  id: string;
  code: string;
};

export type TenantFoundationSummary = {
  id: string;
  code: string;
  slug: string;
  name: string;
  status: 'active' | 'expired' | 'suspended' | string;
  planCode?: string | null;
  accountLimit?: number | null;
  membershipCount: number;
  activeMembershipCount: number;
  ownerUsernames: readonly string[];
};

export type TenantSummary = TenantFoundationSummary & {
  planId?: string | null;
  contactName?: string | null;
  contactMobile?: string | null;
  expiresAt?: string | null;
  createdByUsername?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateTenantRequest = {
  code: string;
  slug: string;
  name: string;
  planCode?: string | null;
  status?: 'active' | 'expired' | 'suspended';
  contactName?: string | null;
  contactMobile?: string | null;
  accountLimit?: number | null;
  expiresAt?: string | null;
};

export type UpdateTenantRequest = {
  code?: string;
  slug?: string;
  name?: string;
  planCode?: string | null;
  contactName?: string | null;
  contactMobile?: string | null;
  accountLimit?: number | null;
  expiresAt?: string | null;
};

export type SetTenantStatusRequest = {
  status: 'active' | 'expired' | 'suspended';
  expiresAt?: string | null;
};

export type PlatformRoleFoundationSummary = {
  code: string;
  name: string;
  enabled: boolean;
  userCount: number;
  permissionCodes: readonly string[];
};

export type TenantBackfillFoundationSummary = {
  userCount: number;
  rootMembershipCount: number;
  userRoleCount: number;
  rootMembershipRoleCount: number;
  userPostCount: number;
  rootMembershipPostCount: number;
  missingRootMembershipUsernames: readonly string[];
};

export type TenantRequestContextSummary = {
  actorUserId?: string;
  tenantId?: string;
  membershipId?: string;
  accessMode?: 'platform' | 'platform-visit' | 'tenant' | string;
};

export type TenancyFoundationSummary = {
  tenancyMode: TenancyMode;
  rootTenantCode: string;
  tenants: readonly TenantFoundationSummary[];
  plans: readonly TenantPlanFoundationSummary[];
  platformRoles: readonly PlatformRoleFoundationSummary[];
  backfill: TenantBackfillFoundationSummary;
  requestContext?: TenantRequestContextSummary;
  generatedAt: string;
};

export type TenantMemberSummary = {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  status: 'active' | 'suspended' | string;
  isOwner: boolean;
  deptId?: string | null;
  deptName?: string | null;
  roleCodes: readonly string[];
  postCodes: readonly string[];
  createdAt: string;
  updatedAt: string;
};

export type UpdateTenantMemberAssignmentsRequest = {
  deptId?: string | null;
  status?: 'active' | 'suspended';
  roleCodes?: readonly string[];
  postCodes?: readonly string[];
};
