export type DictItemRecord = {
  id: string;
  label: string;
  value: string;
  sort: number;
  enabled: boolean;
};

export type DictTypeRecord = {
  id: string;
  code: string;
  name: string;
  description?: string;
  enabled: boolean;
  items: DictItemRecord[];
};

export type SystemConfigRecord = {
  id: string;
  key: string;
  value: string;
  valueType: 'boolean' | 'number' | 'string';
  description?: string;
  public: boolean;
  visibility: 'private' | 'public' | 'secret';
};

export type FileAssetRecord = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  checksum?: string;
  uploadedBy: string;
  createdAt: string;
};

export type AuditLogRecord = {
  id: string;
  actorUsername: string;
  action: string;
  resource: string;
  resourceId?: string;
  method: string;
  path: string;
  statusCode: number;
  ip: string;
  userAgent: string;
  requestId: string;
  metadata?: unknown;
  createdAt: string;
};

export type LoginLogRecord = {
  id: string;
  username: string;
  success: boolean;
  failureReason?: string;
  ip: string;
  userAgent: string;
  requestId: string;
  createdAt: string;
};

export const seedDictTypes: readonly DictTypeRecord[] = [
  {
    id: 'dict_system_status',
    code: 'system.status',
    name: 'System Status',
    description: 'Shared status labels for enabled and disabled records.',
    enabled: true,
    items: [
      {
        id: 'dict_item_enabled',
        label: 'Enabled',
        value: 'enabled',
        sort: 10,
        enabled: true,
      },
      {
        id: 'dict_item_disabled',
        label: 'Disabled',
        value: 'disabled',
        sort: 20,
        enabled: true,
      },
    ],
  },
  {
    id: 'dict_audit_result',
    code: 'audit.result',
    name: 'Audit Result',
    description: 'Result labels used by operation and login logs.',
    enabled: true,
    items: [
      {
        id: 'dict_item_success',
        label: 'Success',
        value: 'success',
        sort: 10,
        enabled: true,
      },
      {
        id: 'dict_item_failure',
        label: 'Failure',
        value: 'failure',
        sort: 20,
        enabled: true,
      },
    ],
  },
];

export const seedSystemConfigs: readonly SystemConfigRecord[] = [
  {
    id: 'config_admin_title',
    key: 'opencore.admin.title',
    value: 'OpenCore Admin',
    valueType: 'string',
    description: 'Public Admin title. Secrets are not accepted in core config.',
    public: true,
    visibility: 'public',
  },
  {
    id: 'config_login_lockout',
    key: 'auth.login.lockoutMinutes',
    value: '15',
    valueType: 'number',
    description: 'Safe login lockout display setting.',
    public: false,
    visibility: 'private',
  },
];

export const seedFileAssets: readonly FileAssetRecord[] = [
  {
    id: 'file_readme',
    originalName: 'opencore-readme.txt',
    mimeType: 'text/plain',
    sizeBytes: 512,
    storageKey: 'runtime/file-assets/opencore-readme.txt',
    checksum: 'sha256:readme',
    uploadedBy: 'admin',
    createdAt: '2026-06-10T00:00:00.000Z',
  },
];

export const seedAuditLogs: readonly AuditLogRecord[] = [
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
    userAgent: 'opencore-smoke',
    requestId: 'req_s7_seed_login',
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
    userAgent: 'opencore-smoke',
    requestId: 'req_s7_seed_config',
    metadata: {
      filter: 'current-page',
    },
    createdAt: '2026-06-10T00:01:00.000Z',
  },
];

export const seedLoginLogs: readonly LoginLogRecord[] = [
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
