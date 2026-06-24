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

export type TenancyPageRequest = {
  page?: number;
  pageSize?: number;
};

export type TenancyPageSummary<T> = {
  items: readonly T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type TenantPlanQueryRequest = TenancyPageRequest & {
  code?: string;
  enabled?: boolean | string;
  keyword?: string;
  moduleCode?: string;
  name?: string;
  orderBy?: string;
  orderDirection?: string;
};

export type TenantPlanPageSummary = TenancyPageSummary<TenantPlanSummary>;

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

export type TenantQueryRequest = TenancyPageRequest & {
  code?: string;
  keyword?: string;
  name?: string;
  orderBy?: string;
  orderDirection?: string;
  ownerUsername?: string;
  planCode?: string;
  status?: 'active' | 'expired' | 'suspended' | string;
};

export type TenantPageSummary = TenancyPageSummary<TenantSummary>;

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
  status: 'active' | 'invited' | 'left' | 'suspended' | string;
  isOwner: boolean;
  deptId?: string | null;
  deptName?: string | null;
  roleCodes: readonly string[];
  postCodes: readonly string[];
  invitedByUsername?: string | null;
  joinedAt?: string | null;
  lastActiveAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TenantMemberQueryRequest = TenancyPageRequest & {
  deptId?: string;
  displayName?: string;
  isOwner?: boolean | string;
  keyword?: string;
  orderBy?: string;
  orderDirection?: string;
  postCode?: string;
  roleCode?: string;
  status?: 'active' | 'invited' | 'left' | 'suspended' | string;
  username?: string;
};

export type TenantMemberPageSummary = TenancyPageSummary<TenantMemberSummary>;

export type CreateTenantMemberRequest = {
  userId?: string;
  username?: string;
  displayName?: string;
  password?: string;
  mobile?: string | null;
  email?: string | null;
  status?: 'active' | 'invited' | 'suspended';
  isOwner?: boolean;
  deptId?: string | null;
  roleCodes?: readonly string[];
  postCodes?: readonly string[];
};

export type UpdateTenantMemberRequest = {
  status?: 'active' | 'invited' | 'left' | 'suspended';
  isOwner?: boolean;
  deptId?: string | null;
  roleCodes?: readonly string[];
  postCodes?: readonly string[];
};

export type TenantMemberDeleteResultSummary = {
  deleted: true;
  id: string;
  tenantId: string;
  userId: string;
  username: string;
};

export type UpdateTenantMemberAssignmentsRequest = {
  deptId?: string | null;
  status?: 'active' | 'suspended';
  roleCodes?: readonly string[];
  postCodes?: readonly string[];
};
