export type DictItemRecord = {
  tenantId: string;
  dictCode: string;
  id: string;
  label: string;
  value: string;
  sort: number;
  enabled: boolean;
  colorType?: string;
  cssClass?: string;
  remark?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type DictDataOptionRecord = DictItemRecord & {
  dictCode: string;
};

export type DictTypeRecord = {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description?: string;
  remark?: string;
  enabled: boolean;
  system: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  items: DictItemRecord[];
};

const SEED_TIMESTAMP = '2026-06-10T00:00:00.000Z';

export const seedDictTypes: readonly DictTypeRecord[] = [
  {
    id: 'dict_system_status',
    tenantId: 'tenant_root',
    code: 'system.status',
    name: 'System Status',
    description: 'Shared status labels for enabled and disabled records.',
    remark: 'Core status dictionary consumed by common admin pages.',
    enabled: true,
    system: true,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
    items: [
      {
        tenantId: 'tenant_root',
        dictCode: 'system.status',
        id: 'dict_item_enabled',
        label: 'Enabled',
        value: 'enabled',
        sort: 10,
        enabled: true,
        colorType: 'success',
        createdAt: SEED_TIMESTAMP,
        updatedAt: SEED_TIMESTAMP,
      },
      {
        tenantId: 'tenant_root',
        dictCode: 'system.status',
        id: 'dict_item_disabled',
        label: 'Disabled',
        value: 'disabled',
        sort: 20,
        enabled: true,
        colorType: 'default',
        createdAt: SEED_TIMESTAMP,
        updatedAt: SEED_TIMESTAMP,
      },
    ],
  },
  {
    id: 'dict_audit_result',
    tenantId: 'tenant_root',
    code: 'audit.result',
    name: 'Audit Result',
    description: 'Result labels used by operation and login logs.',
    remark: 'Core audit result dictionary.',
    enabled: true,
    system: true,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
    items: [
      {
        tenantId: 'tenant_root',
        dictCode: 'audit.result',
        id: 'dict_item_success',
        label: 'Success',
        value: 'success',
        sort: 10,
        enabled: true,
        colorType: 'success',
        createdAt: SEED_TIMESTAMP,
        updatedAt: SEED_TIMESTAMP,
      },
      {
        tenantId: 'tenant_root',
        dictCode: 'audit.result',
        id: 'dict_item_failure',
        label: 'Failure',
        value: 'failure',
        sort: 20,
        enabled: true,
        colorType: 'danger',
        createdAt: SEED_TIMESTAMP,
        updatedAt: SEED_TIMESTAMP,
      },
    ],
  },
  {
    id: 'dict_system_user_gender',
    tenantId: 'tenant_root',
    code: 'system.user.gender',
    name: 'System User Gender',
    description: 'User gender values used by profile and user management.',
    remark: 'Core user profile dictionary.',
    enabled: true,
    system: true,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
    items: [
      {
        tenantId: 'tenant_root',
        dictCode: 'system.user.gender',
        id: 'dict_item_gender_male',
        label: 'Male',
        value: 'male',
        sort: 10,
        enabled: true,
        colorType: 'blue',
        createdAt: SEED_TIMESTAMP,
        updatedAt: SEED_TIMESTAMP,
      },
      {
        tenantId: 'tenant_root',
        dictCode: 'system.user.gender',
        id: 'dict_item_gender_female',
        label: 'Female',
        value: 'female',
        sort: 20,
        enabled: true,
        colorType: 'magenta',
        createdAt: SEED_TIMESTAMP,
        updatedAt: SEED_TIMESTAMP,
      },
      {
        tenantId: 'tenant_root',
        dictCode: 'system.user.gender',
        id: 'dict_item_gender_unknown',
        label: 'Unknown',
        value: 'unknown',
        sort: 30,
        enabled: true,
        colorType: 'default',
        createdAt: SEED_TIMESTAMP,
        updatedAt: SEED_TIMESTAMP,
      },
    ],
  },
  {
    id: 'dict_system_notice_type',
    tenantId: 'tenant_root',
    code: 'system.notice.type',
    name: 'System Notice Type',
    description: 'Notice categories used by system notice center.',
    remark: 'Core notice dictionary.',
    enabled: true,
    system: true,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
    items: [
      {
        tenantId: 'tenant_root',
        dictCode: 'system.notice.type',
        id: 'dict_item_notice_info',
        label: 'Info',
        value: 'info',
        sort: 10,
        enabled: true,
        colorType: 'blue',
        createdAt: SEED_TIMESTAMP,
        updatedAt: SEED_TIMESTAMP,
      },
      {
        tenantId: 'tenant_root',
        dictCode: 'system.notice.type',
        id: 'dict_item_notice_maintenance',
        label: 'Maintenance',
        value: 'maintenance',
        sort: 20,
        enabled: true,
        colorType: 'warning',
        createdAt: SEED_TIMESTAMP,
        updatedAt: SEED_TIMESTAMP,
      },
      {
        tenantId: 'tenant_root',
        dictCode: 'system.notice.type',
        id: 'dict_item_notice_release',
        label: 'Release',
        value: 'release',
        sort: 30,
        enabled: true,
        colorType: 'success',
        createdAt: SEED_TIMESTAMP,
        updatedAt: SEED_TIMESTAMP,
      },
    ],
  },
  {
    id: 'dict_system_notice_status',
    tenantId: 'tenant_root',
    code: 'system.notice.status',
    name: 'System Notice Status',
    description: 'Notice lifecycle statuses.',
    remark: 'Core notice lifecycle dictionary.',
    enabled: true,
    system: true,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
    items: [
      {
        tenantId: 'tenant_root',
        dictCode: 'system.notice.status',
        id: 'dict_item_notice_draft',
        label: 'Draft',
        value: 'draft',
        sort: 10,
        enabled: true,
        colorType: 'default',
        createdAt: SEED_TIMESTAMP,
        updatedAt: SEED_TIMESTAMP,
      },
      {
        tenantId: 'tenant_root',
        dictCode: 'system.notice.status',
        id: 'dict_item_notice_published',
        label: 'Published',
        value: 'published',
        sort: 20,
        enabled: true,
        colorType: 'success',
        createdAt: SEED_TIMESTAMP,
        updatedAt: SEED_TIMESTAMP,
      },
      {
        tenantId: 'tenant_root',
        dictCode: 'system.notice.status',
        id: 'dict_item_notice_archived',
        label: 'Archived',
        value: 'archived',
        sort: 30,
        enabled: true,
        colorType: 'default',
        createdAt: SEED_TIMESTAMP,
        updatedAt: SEED_TIMESTAMP,
      },
    ],
  },
];
