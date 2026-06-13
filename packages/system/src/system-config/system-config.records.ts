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
    description: 'Safe login lockout display setting.',
    remark: 'Private security policy display setting.',
    public: false,
    system: true,
    visibility: 'private',
  },
];
