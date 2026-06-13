export type SystemConfigVisibility = 'private' | 'public' | 'secret';

export type SystemConfigValueType = 'boolean' | 'number' | 'string';

export type SystemConfigRecord = {
  id: string;
  category: string;
  name: string;
  key: string;
  value: string;
  valueType: SystemConfigValueType;
  description?: string;
  remark?: string;
  public: boolean;
  system: boolean;
  visibility: SystemConfigVisibility;
};

export const seedSystemConfigs: readonly SystemConfigRecord[] = [
  {
    id: 'config_admin_title',
    category: 'system',
    name: 'Admin title',
    key: 'opencore.admin.title',
    value: 'OpenCore Admin',
    valueType: 'string',
    description: 'Public Admin title. Secrets are not accepted in core config.',
    remark: 'Shown in the Admin shell title.',
    public: true,
    system: true,
    visibility: 'public',
  },
  {
    id: 'config_login_lockout',
    category: 'security',
    name: 'Login lockout minutes',
    key: 'auth.login.lockoutMinutes',
    value: '15',
    valueType: 'number',
    description: 'Public login lockout runtime setting.',
    remark: 'Shown on the Admin login page as a runtime login policy.',
    public: true,
    system: true,
    visibility: 'public',
  },
  {
    id: 'config_login_max_failed_attempts',
    category: 'security',
    name: 'Login max failed attempts',
    key: 'auth.login.maxFailedAttempts',
    value: '5',
    valueType: 'number',
    description: 'Public login failed-attempt threshold runtime setting.',
    remark: 'Shown on the Admin login page as a runtime login policy.',
    public: true,
    system: true,
    visibility: 'public',
  },
  {
    id: 'config_feature_notice_inbox_enabled',
    category: 'feature',
    name: 'Notice inbox feature flag',
    key: 'feature.notice.inbox.enabled',
    value: 'true',
    valueType: 'boolean',
    description: 'Public runtime feature flag for the notice inbox surface.',
    remark: 'Returned by the runtime config featureFlags map.',
    public: true,
    system: true,
    visibility: 'public',
  },
];
