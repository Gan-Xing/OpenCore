export type TenancyMode = 'shared' | 'single';

export type TenantPlanFoundationSummary = {
  id: string;
  code: string;
  name: string;
  enabled: boolean;
  limits: unknown;
  moduleCodes: readonly string[];
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
