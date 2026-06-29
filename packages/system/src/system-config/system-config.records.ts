export type SystemConfigVisibility = 'private' | 'public' | 'secret';

export type SystemConfigValueType = 'boolean' | 'json' | 'number' | 'string';

export type SystemConfigRecord = {
  id: string;
  tenantId: string;
  category: string;
  name: string;
  key: string;
  value: string;
  valueType: SystemConfigValueType;
  description?: string;
  encrypted: boolean;
  remark?: string;
  public: boolean;
  system: boolean;
  visibility: SystemConfigVisibility;
};

export type SystemConfigEnvironmentOverrideRecord = {
  id: string;
  tenantId: string;
  key: string;
  environment: string;
  value: string;
  valueType: SystemConfigValueType;
  description?: string;
  remark?: string;
  public: true;
  visibility: 'public';
  createdAt: string;
  updatedAt: string;
};

export type SystemConfigSecretVersionRecord = {
  id: string;
  tenantId: string;
  key: string;
  version: number;
  active: boolean;
  encrypted: true;
  envelopeVersion: 'v1' | 'v2' | 'v3';
  vaultProvider?: 'env' | 'opencore.http-json';
  vaultKeyId?: string;
  activeVaultKey: boolean;
  rotatedBy?: string;
  reason?: string;
  createdAt: string;
};

export type SystemConfigVaultStatusRecord = {
  provider: 'env' | 'opencore.http-json';
  activeKeyId: string;
  endpointHost?: string;
  externalEncryptionEnabled: boolean;
  keyIds: readonly string[];
  lastError?: string;
  legacyDecryptEnabled: boolean;
  mode: 'local' | 'managed';
  ready: boolean;
  timeoutMs?: number;
  encryptedConfigCount: number;
  secretVersionCount: number;
  activeKeyConfigCount: number;
  legacyEnvelopeCount: number;
  staleKeyEnvelopeCount: number;
};

export type SystemConfigVaultKeyRotationRecord =
  SystemConfigVaultStatusRecord & {
    rotatedAt: string;
    rotatedBy?: string;
    reason?: string;
    rewrappedConfigCount: number;
    rewrappedSecretVersionCount: number;
  };

const ROOT_TENANT_ID = 'tenant_root';

export const seedSystemConfigs: readonly SystemConfigRecord[] = [
  {
    id: 'config_admin_title',
    tenantId: ROOT_TENANT_ID,
    category: 'system',
    name: 'Admin title',
    key: 'opencore.admin.title',
    value: 'OpenCore Admin',
    valueType: 'string',
    description: 'Public Admin title. Secrets are not accepted in core config.',
    encrypted: false,
    remark: 'Shown in the Admin shell title.',
    public: true,
    system: true,
    visibility: 'public',
  },
  {
    id: 'config_login_lockout',
    tenantId: ROOT_TENANT_ID,
    category: 'security',
    name: 'Login lockout minutes',
    key: 'auth.login.lockoutMinutes',
    value: '15',
    valueType: 'number',
    description: 'Public login lockout runtime setting.',
    encrypted: false,
    remark: 'Shown on the Admin login page as a runtime login policy.',
    public: true,
    system: true,
    visibility: 'public',
  },
  {
    id: 'config_login_max_failed_attempts',
    tenantId: ROOT_TENANT_ID,
    category: 'security',
    name: 'Login max failed attempts',
    key: 'auth.login.maxFailedAttempts',
    value: '5',
    valueType: 'number',
    description: 'Public login failed-attempt threshold runtime setting.',
    encrypted: false,
    remark: 'Shown on the Admin login page as a runtime login policy.',
    public: true,
    system: true,
    visibility: 'public',
  },
  {
    id: 'config_feature_notice_inbox_enabled',
    tenantId: ROOT_TENANT_ID,
    category: 'feature',
    name: 'Notice inbox feature flag',
    key: 'feature.notice.inbox.enabled',
    value: 'true',
    valueType: 'boolean',
    description: 'Public runtime feature flag for the notice inbox surface.',
    encrypted: false,
    remark: 'Returned by the runtime config featureFlags map.',
    public: true,
    system: true,
    visibility: 'public',
  },
  {
    id: 'config_feature_notice_inbox_rollout',
    tenantId: ROOT_TENANT_ID,
    category: 'feature',
    name: 'Notice inbox rollout percentage',
    key: 'feature.notice.inbox.rolloutPercentage',
    value: '100',
    valueType: 'number',
    description: 'Public rollout percentage for the notice inbox feature flag.',
    encrypted: false,
    remark: 'Returned by the runtime config featureFlagRules map.',
    public: true,
    system: true,
    visibility: 'public',
  },
  {
    id: 'config_feature_notice_inbox_audience',
    tenantId: ROOT_TENANT_ID,
    category: 'feature',
    name: 'Notice inbox audience rules',
    key: 'feature.notice.inbox.audienceRules',
    value: '{"mode":"all","rules":[]}',
    valueType: 'json',
    description: 'Public runtime audience targeting rules for notice inbox.',
    encrypted: false,
    remark: 'Returned by the runtime config featureFlagRules map.',
    public: true,
    system: true,
    visibility: 'public',
  },
  {
    id: 'config_jwt_secret_ref',
    tenantId: ROOT_TENANT_ID,
    category: 'security',
    name: 'JWT secret reference',
    key: 'auth.jwt.secretRef',
    value: 'env:AUTH_TOKEN_SECRET',
    valueType: 'string',
    description: 'Secret runtime value reference stored through config vault.',
    encrypted: false,
    remark: 'Real secret material stays outside public runtime config.',
    public: false,
    system: true,
    visibility: 'secret',
  },
  {
    id: 'config_integration_mail_smtp_password',
    tenantId: ROOT_TENANT_ID,
    category: 'integration',
    name: 'Mail SMTP password',
    key: 'integration.mail.smtp.password.secret',
    value: 'opencore-local-smtp-password',
    valueType: 'string',
    description: 'Secret password used by the default disabled SMTP provider.',
    encrypted: false,
    remark: 'Runtime SMTP adapters resolve this value only through secretRef.',
    public: false,
    system: true,
    visibility: 'secret',
  },
  {
    id: 'config_integration_sms_http_api_key',
    tenantId: ROOT_TENANT_ID,
    category: 'integration',
    name: 'SMS HTTP API key',
    key: 'integration.sms.http.api-key.secret',
    value: 'opencore-local-sms-api-key',
    valueType: 'string',
    description: 'Secret API key used by SMS HTTP provider secret injection.',
    encrypted: false,
    remark:
      'Runtime SMS HTTP adapters inject this value only through secretRef.',
    public: false,
    system: true,
    visibility: 'secret',
  },
];
