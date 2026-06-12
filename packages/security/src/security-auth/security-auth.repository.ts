export type SecurityAuthUserRecord = {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  roleCodes: readonly string[];
  enabled: boolean;
};

export type SecurityLoginAttemptRecord = {
  username: string;
  success: boolean;
  failureReason?: string;
  ip: string;
  userAgent: string;
  requestId: string;
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

export abstract class SecurityAuthUserRepository {
  abstract findUserByUsername(
    username: string,
  ): Promise<SecurityAuthUserRecord | undefined>;

  abstract findUserById(
    id: string,
  ): Promise<SecurityAuthUserRecord | undefined>;

  abstract getPermissionCodesForUser(userId: string): Promise<string[]>;
}
