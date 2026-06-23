export type SecurityAuthUserRecord = {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  roleCodes: readonly string[];
  enabled: boolean;
  avatarUrl?: string;
};

export type SecurityTenantAccessMode = 'platform' | 'platform-visit' | 'tenant';

export type SecurityAuthTenantMembershipRecord = {
  membershipId: string;
  membershipStatus: string;
  tenantId: string;
  tenantCode: string;
  tenantSlug: string;
  tenantName: string;
  tenantStatus: string;
  tenantExpiresAt?: string;
  isOwner: boolean;
  enabledModuleCodes: readonly string[];
  roleCodes?: readonly string[];
  postCodes?: readonly string[];
  permissionCodes?: readonly string[];
};

export type SecurityAuthTenantRecord = {
  id: string;
  code: string;
  slug: string;
  name: string;
  status: string;
  expiresAt?: string;
  enabledModuleCodes: readonly string[];
};

export type SecurityAuthTenantMembershipLookup = {
  userId: string;
  membershipId?: string;
  tenantCode?: string;
  tenantHost?: string;
  tenantId?: string;
};

export type SecurityLoginAttemptRecord = {
  username: string;
  tenantId?: string;
  logType?: SecurityLoginLogType;
  result?: SecurityLoginResult;
  success: boolean;
  failureReason?: string;
  actorUsername?: string;
  reason?: string;
  ip: string;
  userAgent: string;
  requestId: string;
};

export type SecurityLoginLogType =
  | 'login.mobile'
  | 'login.sms'
  | 'login.social'
  | 'login.username'
  | 'logout.force'
  | 'logout.self';

export type SecurityLoginResult =
  | 'account_locked'
  | 'bad_credentials'
  | 'captcha_code_error'
  | 'captcha_not_found'
  | 'success'
  | 'user_disabled';

export type SecurityLoginPolicy = {
  maxFailedAttempts: number;
  lockoutMinutes: number;
};

export type SecurityLoginLockoutRecord = {
  tenantId?: string;
  username: string;
  failedAttempts: number;
  lockedUntil?: string;
  lastFailedAt?: string;
};

export type SecurityLoginLockoutLookupInput =
  | string
  | {
      tenantId?: string;
      username: string;
    };

export type SecurityLoginLockoutAttemptInput = SecurityLoginPolicy & {
  tenantId?: string;
  username: string;
  occurredAt?: string;
};

export type SecurityLoginUnlockResult = {
  tenantId: string;
  username: string;
  unlocked: boolean;
  failedAttempts: number;
  lockedUntil?: string;
};

export type SecurityAuthSessionRecord = {
  userId: string;
  username: string;
  tokenId: string;
  tenantId: string;
  membershipId?: string;
  accessMode: SecurityTenantAccessMode;
  ip: string;
  userAgent: string;
  lastSeenAt: string;
  expiresAt: string;
};

export type SecurityAuthSessionContext = Pick<
  SecurityAuthSessionRecord,
  'accessMode' | 'membershipId' | 'tenantId' | 'tokenId'
>;

export type SecurityAuthSessionRevocationInput = {
  actor: string;
  reason: string;
};

export abstract class SecurityLoginAttemptRecorder {
  abstract recordLoginAttempt(
    record: SecurityLoginAttemptRecord,
  ): Promise<void>;
}

export class NoopSecurityLoginAttemptRecorder extends SecurityLoginAttemptRecorder {
  async recordLoginAttempt(): Promise<void> {
    return undefined;
  }
}

export abstract class SecurityLoginPolicyProvider {
  abstract getLoginPolicy(): Promise<SecurityLoginPolicy>;
}

export class DefaultSecurityLoginPolicyProvider extends SecurityLoginPolicyProvider {
  async getLoginPolicy(): Promise<SecurityLoginPolicy> {
    return {
      maxFailedAttempts: 5,
      lockoutMinutes: 30,
    };
  }
}

export abstract class SecurityLoginLockoutRepository {
  abstract getLoginLockout(
    input: SecurityLoginLockoutLookupInput,
  ): Promise<SecurityLoginLockoutRecord | undefined>;

  abstract recordFailedLoginAttempt(
    input: SecurityLoginLockoutAttemptInput,
  ): Promise<SecurityLoginLockoutRecord>;

  abstract clearLoginLockout(
    input: SecurityLoginLockoutLookupInput,
  ): Promise<SecurityLoginUnlockResult>;
}

export class NoopSecurityLoginLockoutRepository extends SecurityLoginLockoutRepository {
  async getLoginLockout(): Promise<undefined> {
    return undefined;
  }

  async recordFailedLoginAttempt(
    input: SecurityLoginLockoutAttemptInput,
  ): Promise<SecurityLoginLockoutRecord> {
    return {
      tenantId: input.tenantId,
      username: input.username,
      failedAttempts: 1,
      lastFailedAt: input.occurredAt ?? new Date().toISOString(),
    };
  }

  async clearLoginLockout(
    input: SecurityLoginLockoutLookupInput,
  ): Promise<SecurityLoginUnlockResult> {
    const lookup = normalizeLoginLockoutLookupInput(input);

    return {
      tenantId: lookup.tenantId ?? 'tenant_root',
      username: lookup.username,
      unlocked: false,
      failedAttempts: 0,
    };
  }
}

export function normalizeLoginLockoutLookupInput(
  input: SecurityLoginLockoutLookupInput,
): { tenantId?: string; username: string } {
  return typeof input === 'string' ? { username: input } : input;
}

export abstract class SecurityAuthSessionRepository {
  abstract registerSession(record: SecurityAuthSessionRecord): Promise<void>;

  abstract assertSessionActive(
    tokenId: string,
  ): Promise<SecurityAuthSessionContext | undefined>;

  abstract revokeSession(
    tokenId: string,
    input: SecurityAuthSessionRevocationInput,
  ): Promise<void>;
}

export class AllowAllSecurityAuthSessionRepository extends SecurityAuthSessionRepository {
  async registerSession(): Promise<void> {
    return undefined;
  }

  async assertSessionActive(): Promise<undefined> {
    return undefined;
  }

  async revokeSession(): Promise<void> {
    return undefined;
  }
}

export abstract class SecurityAuthUserRepository {
  abstract findUserByUsername(
    username: string,
  ): Promise<SecurityAuthUserRecord | undefined>;

  abstract findUserById(
    id: string,
  ): Promise<SecurityAuthUserRecord | undefined>;

  abstract getPermissionCodesForUser(userId: string): Promise<string[]>;

  async listTenantMembershipsForUser(
    userId: string,
  ): Promise<readonly SecurityAuthTenantMembershipRecord[]> {
    return [createDefaultRootTenantMembership(userId)];
  }

  async findTenantMembershipForUser(
    input: SecurityAuthTenantMembershipLookup,
  ): Promise<SecurityAuthTenantMembershipRecord | undefined> {
    const memberships = await this.listTenantMembershipsForUser(input.userId);
    const hostTenantCode = normalizeTenantHostCode(input.tenantHost);

    return memberships.find(
      (membership) =>
        (!input.membershipId ||
          membership.membershipId === input.membershipId) &&
        (!input.tenantId || membership.tenantId === input.tenantId) &&
        (!input.tenantCode ||
          membership.tenantCode === input.tenantCode ||
          membership.tenantSlug === input.tenantCode) &&
        (!hostTenantCode ||
          membership.tenantCode === hostTenantCode ||
          membership.tenantSlug === hostTenantCode),
    );
  }

  async findTenantForVisit(
    input: Pick<
      SecurityAuthTenantMembershipLookup,
      'tenantCode' | 'tenantHost' | 'tenantId'
    >,
  ): Promise<SecurityAuthTenantRecord | undefined> {
    const hostTenantCode = normalizeTenantHostCode(input.tenantHost);

    if (
      input.tenantId === 'tenant_root' ||
      input.tenantCode === 'root' ||
      hostTenantCode === 'root'
    ) {
      return createDefaultRootTenantRecord();
    }

    return undefined;
  }
}

function createDefaultRootTenantMembership(
  userId: string,
): SecurityAuthTenantMembershipRecord {
  const tenant = createDefaultRootTenantRecord();

  return {
    enabledModuleCodes: [],
    isOwner: userId === 'user_admin',
    membershipId: `tenant_membership_root_${userId}`,
    membershipStatus: 'active',
    tenantCode: tenant.code,
    tenantId: tenant.id,
    tenantName: tenant.name,
    tenantSlug: tenant.slug,
    tenantStatus: tenant.status,
  };
}

function createDefaultRootTenantRecord(): SecurityAuthTenantRecord {
  return {
    code: 'root',
    enabledModuleCodes: [],
    id: 'tenant_root',
    name: 'Root Tenant',
    slug: 'root',
    status: 'active',
  };
}

function normalizeTenantHostCode(
  value: string | undefined,
): string | undefined {
  if (!value) {
    return undefined;
  }

  const host = value.split(':')[0]?.trim().toLowerCase();

  if (!host || host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/u.test(host)) {
    return undefined;
  }

  return host.split('.')[0];
}
