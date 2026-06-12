export type SystemConfigVisibility = 'private' | 'public' | 'secret';

export type SystemConfigValueType = 'boolean' | 'number' | 'string';

export type SystemConfigRecord = {
  id: string;
  key: string;
  value: string;
  valueType: SystemConfigValueType;
  description?: string;
  public: boolean;
  visibility: SystemConfigVisibility;
};

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
