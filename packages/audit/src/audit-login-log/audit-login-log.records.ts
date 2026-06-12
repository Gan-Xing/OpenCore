import { parseUserAgent } from '@opencore/common';

export type AuditLoginLogRecord = {
  id: string;
  username: string;
  success: boolean;
  failureReason?: string;
  ip: string;
  userAgent: string;
  browser: string;
  os: string;
  requestId: string;
  createdAt: string;
};

export type AuditLoginLogStoredRecord = Omit<
  AuditLoginLogRecord,
  'browser' | 'os'
>;

export function enrichAuditLoginLogRecord(
  record: AuditLoginLogStoredRecord,
): AuditLoginLogRecord {
  return {
    ...record,
    ...parseUserAgent(record.userAgent),
  };
}

export const seedAuditLoginLogs: readonly AuditLoginLogRecord[] = [
  enrichAuditLoginLogRecord({
    id: 'login_success_admin',
    username: 'admin',
    success: true,
    ip: '127.0.0.1',
    userAgent: 'opencore-smoke',
    requestId: 'req_s7_seed_login',
    createdAt: '2026-06-10T00:00:00.000Z',
  }),
  enrichAuditLoginLogRecord({
    id: 'login_failure_unknown',
    username: 'unknown',
    success: false,
    failureReason: 'Invalid username or password',
    ip: '127.0.0.1',
    userAgent: 'opencore-smoke',
    requestId: 'req_s7_seed_login_fail',
    createdAt: '2026-06-10T00:02:00.000Z',
  }),
];
