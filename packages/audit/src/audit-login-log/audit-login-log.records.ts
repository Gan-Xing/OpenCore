export type AuditLoginLogRecord = {
  id: string;
  username: string;
  success: boolean;
  failureReason?: string;
  ip: string;
  userAgent: string;
  requestId: string;
  createdAt: string;
};

export const seedAuditLoginLogs: readonly AuditLoginLogRecord[] = [
  {
    id: 'login_success_admin',
    username: 'admin',
    success: true,
    ip: '127.0.0.1',
    userAgent: 'opencore-smoke',
    requestId: 'req_s7_seed_login',
    createdAt: '2026-06-10T00:00:00.000Z',
  },
  {
    id: 'login_failure_unknown',
    username: 'unknown',
    success: false,
    failureReason: 'Invalid username or password',
    ip: '127.0.0.1',
    userAgent: 'opencore-smoke',
    requestId: 'req_s7_seed_login_fail',
    createdAt: '2026-06-10T00:02:00.000Z',
  },
];
