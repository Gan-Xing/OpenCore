import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@opencore/database';
import {
  SecurityLoginLockoutRepository,
  type SecurityLoginLockoutAttemptInput,
  type SecurityLoginLockoutRecord,
  type SecurityLoginUnlockResult,
} from '@opencore/security';

type PrismaLoginLockout = {
  username: string;
  failedAttempts: number;
  lockedUntil: Date | null;
  lastFailedAt: Date | null;
};

@Injectable()
export class PrismaSecurityLoginLockoutRepository extends SecurityLoginLockoutRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getLoginLockout(
    username: string,
  ): Promise<SecurityLoginLockoutRecord | undefined> {
    const normalizedUsername = normalizeLockoutUsername(username);
    const record = await this.prisma.loginLockout.findUnique({
      where: { username: normalizedUsername },
    });

    return record ? toSecurityLoginLockoutRecord(record) : undefined;
  }

  async recordFailedLoginAttempt(
    input: SecurityLoginLockoutAttemptInput,
  ): Promise<SecurityLoginLockoutRecord> {
    const username = normalizeLockoutUsername(input.username);
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
      where: { username },
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
      where: { username },
      update: {
        failedAttempts,
        lastFailedAt: occurredAt,
        lockedUntil,
      },
      create: {
        username,
        failedAttempts,
        lastFailedAt: occurredAt,
        lockedUntil,
      },
    });

    return toSecurityLoginLockoutRecord(record);
  }

  async clearLoginLockout(
    username: string,
  ): Promise<SecurityLoginUnlockResult> {
    const normalizedUsername = normalizeLockoutUsername(username);
    const existing = await this.prisma.loginLockout.findUnique({
      where: { username: normalizedUsername },
    });

    if (!existing) {
      return {
        username: normalizedUsername,
        unlocked: false,
        failedAttempts: 0,
      };
    }

    await this.prisma.loginLockout.delete({
      where: { username: normalizedUsername },
    });

    return {
      username: normalizedUsername,
      unlocked: existing.failedAttempts > 0 || existing.lockedUntil !== null,
      failedAttempts: existing.failedAttempts,
      lockedUntil: existing.lockedUntil?.toISOString(),
    };
  }
}

function normalizeLockoutUsername(username: string): string {
  const normalized = username.trim();

  if (!normalized) {
    throw new BadRequestException('Login username is required.');
  }

  return normalized;
}

function normalizePositiveInteger(value: number, fieldName: string): number {
  if (!Number.isInteger(value) || value < 1) {
    throw new BadRequestException(`${fieldName} must be a positive integer.`);
  }

  return value;
}

function normalizeDate(value: string | undefined): Date {
  if (value === undefined) {
    return new Date();
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException('occurredAt must be a valid ISO date-time.');
  }

  return date;
}

function toSecurityLoginLockoutRecord(
  record: PrismaLoginLockout,
): SecurityLoginLockoutRecord {
  return {
    username: record.username,
    failedAttempts: record.failedAttempts,
    lockedUntil: record.lockedUntil?.toISOString(),
    lastFailedAt: record.lastFailedAt?.toISOString(),
  };
}
