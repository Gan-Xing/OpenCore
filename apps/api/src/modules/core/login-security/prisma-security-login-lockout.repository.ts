import { BadRequestException, Injectable } from '@nestjs/common';
import { createApiErrorBody } from '@opencore/common';
import { PrismaService } from '@opencore/database';
import {
  normalizeLoginLockoutLookupInput,
  SecurityLoginLockoutRepository,
  type SecurityLoginLockoutAttemptInput,
  type SecurityLoginLockoutLookupInput,
  type SecurityLoginLockoutRecord,
  type SecurityLoginUnlockResult,
} from '@opencore/security';

type PrismaLoginLockout = {
  tenantId: string;
  username: string;
  failedAttempts: number;
  lockedUntil: Date | null;
  lastFailedAt: Date | null;
};

const ROOT_TENANT_ID = 'tenant_root';

@Injectable()
export class PrismaSecurityLoginLockoutRepository extends SecurityLoginLockoutRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getLoginLockout(
    input: SecurityLoginLockoutLookupInput,
  ): Promise<SecurityLoginLockoutRecord | undefined> {
    const lookup = normalizeLockoutLookup(input);
    const record = await this.prisma.loginLockout.findUnique({
      where: {
        tenantId_username: {
          tenantId: lookup.tenantId,
          username: lookup.username,
        },
      },
    });

    return record ? toSecurityLoginLockoutRecord(record) : undefined;
  }

  async recordFailedLoginAttempt(
    input: SecurityLoginLockoutAttemptInput,
  ): Promise<SecurityLoginLockoutRecord> {
    const username = normalizeLockoutUsername(input.username);
    const tenantId = normalizeLockoutTenantId(input.tenantId);
    const maxFailedAttempts = normalizePositiveInteger(
      input.maxFailedAttempts,
      'maxFailedAttempts',
    );
    const lockoutMinutes = normalizePositiveInteger(
      input.lockoutMinutes,
      'lockoutMinutes',
    );
    const occurredAt = normalizeDate(input.occurredAt);
    const existing = await this.prisma.loginLockout.findUnique({
      where: {
        tenantId_username: {
          tenantId,
          username,
        },
      },
    });
    const windowStart = new Date(
      occurredAt.getTime() - lockoutMinutes * 60_000,
    );
    const shouldReset =
      !existing ||
      (existing.lockedUntil !== null && existing.lockedUntil <= occurredAt) ||
      (existing.lastFailedAt !== null && existing.lastFailedAt < windowStart);
    const failedAttempts = shouldReset ? 1 : existing.failedAttempts + 1;
    const lockedUntil =
      failedAttempts >= maxFailedAttempts
        ? new Date(occurredAt.getTime() + lockoutMinutes * 60_000)
        : null;
    const record = await this.prisma.loginLockout.upsert({
      where: {
        tenantId_username: {
          tenantId,
          username,
        },
      },
      update: {
        failedAttempts,
        lastFailedAt: occurredAt,
        lockedUntil,
      },
      create: {
        tenantId,
        username,
        failedAttempts,
        lastFailedAt: occurredAt,
        lockedUntil,
      },
    });

    return toSecurityLoginLockoutRecord(record);
  }

  async clearLoginLockout(
    input: SecurityLoginLockoutLookupInput,
  ): Promise<SecurityLoginUnlockResult> {
    const lookup = normalizeLockoutLookup(input);
    const existing = await this.prisma.loginLockout.findUnique({
      where: {
        tenantId_username: {
          tenantId: lookup.tenantId,
          username: lookup.username,
        },
      },
    });

    if (!existing) {
      return {
        tenantId: lookup.tenantId,
        username: lookup.username,
        unlocked: false,
        failedAttempts: 0,
      };
    }

    await this.prisma.loginLockout.delete({
      where: {
        tenantId_username: {
          tenantId: lookup.tenantId,
          username: lookup.username,
        },
      },
    });

    return {
      tenantId: lookup.tenantId,
      username: lookup.username,
      unlocked: existing.failedAttempts > 0 || existing.lockedUntil !== null,
      failedAttempts: existing.failedAttempts,
      lockedUntil: existing.lockedUntil?.toISOString(),
    };
  }
}

function normalizeLockoutLookup(input: SecurityLoginLockoutLookupInput): {
  tenantId: string;
  username: string;
} {
  const lookup = normalizeLoginLockoutLookupInput(input);

  return {
    tenantId: normalizeLockoutTenantId(lookup.tenantId),
    username: normalizeLockoutUsername(lookup.username),
  };
}

function normalizeLockoutTenantId(tenantId: string | undefined): string {
  const normalized = tenantId?.trim();

  return normalized || ROOT_TENANT_ID;
}

function normalizeLockoutUsername(username: string): string {
  const normalized = username.trim();

  if (!normalized) {
    throw loginSecurityBadRequest(
      'SECURITY_LOGIN_USERNAME_REQUIRED',
      'Login username is required.',
      { field: 'username' },
    );
  }

  return normalized;
}

function normalizePositiveInteger(value: number, fieldName: string): number {
  if (!Number.isInteger(value) || value < 1) {
    throw loginSecurityBadRequest(
      'SECURITY_LOGIN_LOCKOUT_POLICY_INVALID',
      'Login lockout policy value must be a positive integer.',
      { field: fieldName },
    );
  }

  return value;
}

function normalizeDate(value: string | undefined): Date {
  if (value === undefined) {
    return new Date();
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw loginSecurityBadRequest(
      'SECURITY_LOGIN_LOCKOUT_OCCURRED_AT_INVALID',
      'Login lockout attempt time must be a valid ISO date-time.',
      { field: 'occurredAt' },
    );
  }

  return date;
}

function loginSecurityBadRequest(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): BadRequestException {
  return new BadRequestException(
    createApiErrorBody({ code, message, details }),
  );
}

function toSecurityLoginLockoutRecord(
  record: PrismaLoginLockout,
): SecurityLoginLockoutRecord {
  return {
    tenantId: record.tenantId,
    username: record.username,
    failedAttempts: record.failedAttempts,
    lockedUntil: record.lockedUntil?.toISOString(),
    lastFailedAt: record.lastFailedAt?.toISOString(),
  };
}
