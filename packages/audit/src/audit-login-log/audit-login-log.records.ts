import { parseIpLocation, parseUserAgent } from '@opencore/common';
import type {
  SecurityLoginLogType,
  SecurityLoginResult,
} from '@opencore/security';

export type AuditLoginLogRecord = {
  id: string;
  tenantId: string;
  username: string;
  logType: SecurityLoginLogType;
  result: SecurityLoginResult;
  success: boolean;
  failureReason?: string;
  actorUsername?: string;
  reason?: string;
  ip: string;
  location: string;
  userAgent: string;
  browser: string;
  os: string;
  requestId: string;
  createdAt: string;
};

export type AuditLoginLogStoredRecord = Omit<
  AuditLoginLogRecord,
  'browser' | 'location' | 'os'
> & { location?: string };

export function enrichAuditLoginLogRecord(
  record: AuditLoginLogStoredRecord,
): AuditLoginLogRecord {
  return {
    ...record,
    location: record.location ?? parseIpLocation(record.ip),
    ...parseUserAgent(record.userAgent),
  };
}

export const seedAuditLoginLogs: readonly AuditLoginLogRecord[] = [
  enrichAuditLoginLogRecord({
    id: 'login_success_admin',
    tenantId: 'tenant_root',
    username: 'admin',
    logType: 'login.username',
    result: 'success',
    success: true,
    ip: '127.0.0.1',
    location: 'Loopback',
    userAgent: 'opencore-smoke',
    requestId: 'req_s7_seed_login',
    createdAt: '2026-06-10T00:00:00.000Z',
  }),
  enrichAuditLoginLogRecord({
    id: 'login_failure_unknown',
    tenantId: 'tenant_root',
    username: 'unknown',
    logType: 'login.username',
    result: 'bad_credentials',
    success: false,
    failureReason: 'Invalid username or password',
    ip: '127.0.0.1',
    location: 'Loopback',
    userAgent: 'opencore-smoke',
    requestId: 'req_s7_seed_login_fail',
    createdAt: '2026-06-10T00:02:00.000Z',
  }),
];
