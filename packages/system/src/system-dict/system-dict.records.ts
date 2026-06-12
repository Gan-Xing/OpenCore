export type DictItemRecord = {
  id: string;
  label: string;
  value: string;
  sort: number;
  enabled: boolean;
};

export type DictDataOptionRecord = DictItemRecord & {
  dictCode: string;
};

export type DictTypeRecord = {
  id: string;
  code: string;
  name: string;
  description?: string;
  enabled: boolean;
  items: DictItemRecord[];
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
