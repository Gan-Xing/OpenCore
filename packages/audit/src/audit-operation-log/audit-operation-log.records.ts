export type AuditOperationLogRecord = {
  id: string;
  actorUsername: string;
  action: string;
  resource: string;
  resourceId?: string;
  method: string;
  path: string;
  statusCode: number;
  ip: string;
  location: string;
  userAgent: string;
  requestId: string;
  durationMs: number;
  metadata?: unknown;
  createdAt: string;
};

export type CreateAuditOperationLogRecord = Omit<
  AuditOperationLogRecord,
  'id' | 'createdAt'
>;

export const seedAuditOperationLogs: readonly AuditOperationLogRecord[] = [
  {
    id: 'audit_admin_login',
    actorUsername: 'admin',
    action: 'login',
    resource: 'auth',
    resourceId: 'user_admin',
    method: 'POST',
    path: '/api/auth/login',
    statusCode: 200,
    ip: '127.0.0.1',
    location: 'Loopback',
    userAgent: 'opencore-smoke',
    requestId: 'req_s7_seed_login',
    durationMs: 12,
    metadata: {
      username: 'admin',
      password: 'admin123',
      authorization: 'Bearer seed',
    },
    createdAt: '2026-06-10T00:00:00.000Z',
  },
  {
    id: 'audit_config_read',
    actorUsername: 'admin',
    action: 'read',
    resource: 'core.config',
    method: 'GET',
    path: '/api/core/config',
    statusCode: 200,
    ip: '127.0.0.1',
    location: 'Loopback',
    userAgent: 'opencore-smoke',
    requestId: 'req_s7_seed_config',
    durationMs: 18,
    metadata: {
      filter: 'current-page',
    },
    createdAt: '2026-06-10T00:01:00.000Z',
  },
];
