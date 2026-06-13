export type SecurityAuthUserRecord = {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  roleCodes: readonly string[];
  enabled: boolean;
  avatarUrl?: string;
};

export type SecurityLoginAttemptRecord = {
  username: string;
  logType?: SecurityLoginLogType;
  result?: SecurityLoginResult;
  success: boolean;
  failureReason?: string;
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
  username: string;
  failedAttempts: number;
  lockedUntil?: string;
  lastFailedAt?: string;
};

export type SecurityLoginLockoutAttemptInput = SecurityLoginPolicy & {
  username: string;
  occurredAt?: string;
};

export type SecurityLoginUnlockResult = {
  username: string;
  unlocked: boolean;
  failedAttempts: number;
  lockedUntil?: string;
};

export type SecurityAuthSessionRecord = {
  userId: string;
  username: string;
  tokenId: string;
  ip: string;
  userAgent: string;
  lastSeenAt: string;
  expiresAt: string;
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
    username: string,
  ): Promise<SecurityLoginLockoutRecord | undefined>;

  abstract recordFailedLoginAttempt(
    input: SecurityLoginLockoutAttemptInput,
  ): Promise<SecurityLoginLockoutRecord>;

  abstract clearLoginLockout(
    username: string,
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
      username: input.username,
      failedAttempts: 1,
      lastFailedAt: input.occurredAt ?? new Date().toISOString(),
    };
  }

  async clearLoginLockout(
    username: string,
  ): Promise<SecurityLoginUnlockResult> {
    return {
      username,
      unlocked: false,
      failedAttempts: 0,
    };
  }
}

export abstract class SecurityAuthSessionRepository {
  abstract registerSession(record: SecurityAuthSessionRecord): Promise<void>;

  abstract assertSessionActive(tokenId: string): Promise<void>;
}

export class AllowAllSecurityAuthSessionRepository extends SecurityAuthSessionRepository {
  async registerSession(): Promise<void> {
    return undefined;
  }

  async assertSessionActive(): Promise<void> {
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
}
