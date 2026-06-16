import {
  ApartmentOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  KeyOutlined,
  LockOutlined,
  PercentageOutlined,
  PlusOutlined,
  ReloadOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import { useAccess, useIntl } from '@umijs/max';
import type {
  SystemConfigSecretVersionSummary,
  SystemConfigSummary,
  SystemConfigVaultStatusSummary,
} from '@opencore/sdk';
import {
  Alert,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { useEffect, useMemo, useState, type Key } from 'react';
import {
  createOpenCoreSystemConfig,
  deleteOpenCoreSystemConfigEnvironmentOverride,
  deleteOpenCoreSystemConfig,
  deleteOpenCoreSystemConfigs,
  exportOpenCoreSystemConfig,
  getOpenCoreSystemConfig,
  getOpenCoreSystemConfigValue,
  getOpenCoreSystemConfigVaultStatus,
  listOpenCoreSystemConfigEnvironmentOverrides,
  listOpenCoreSystemConfigSecretVersions,
  listOpenCoreSystemConfig,
  refreshOpenCoreSystemConfigCache,
  rotateOpenCoreSystemConfigSecret,
  rotateOpenCoreSystemConfigVaultKey,
  updateOpenCoreSystemConfig,
  upsertOpenCoreSystemConfigEnvironmentOverride,
} from '@/services/opencore/platform';
import {
  CurrentPageExportButton,
  type CurrentPageExportColumn,
} from '../shared/CurrentPageExportButton';
import { downloadBase64File } from '../shared/downloadBase64File';
import {
  createCurrentPageFilterOptions,
  useCurrentPageFilters,
  type CurrentPageFilterOption,
  type CurrentPageSearchField,
} from '../shared/CurrentPageFilters';
import {
  ReadOnlyDetailDrawer,
  type DetailField,
} from '../shared/ReadOnlyDetailDrawer';

type ConfigValueType = SystemConfigSummary['valueType'];
type ConfigVisibility = SystemConfigSummary['visibility'];

type ConfigFormValues = {
  category: string;
  description?: string;
  key: string;
  name: string;
  remark?: string;
  value?: string;
  valueType: ConfigValueType;
  visibility: ConfigVisibility;
};

type EnvironmentOverrideFormValues = {
  description?: string;
  environment: string;
  remark?: string;
  value: string;
};

type SecretRotationFormValues = {
  reason?: string;
  rotatedBy?: string;
  value: string;
};

type VaultRotationFormValues = {
  reason?: string;
  rotatedBy?: string;
};

const featureFlagConfigKeyPattern =
  /^feature\.[a-z0-9]+(?:[.-][a-z0-9]+)*\.enabled$/;
const featureFlagRolloutConfigKeyPattern =
  /^feature\.[a-z0-9]+(?:[.-][a-z0-9]+)*\.rolloutPercentage$/;
const featureFlagAudienceConfigKeyPattern =
  /^feature\.[a-z0-9]+(?:[.-][a-z0-9]+)*\.audienceRules$/;
const searchFields: CurrentPageSearchField<SystemConfigSummary>[] = [
  'name',
  'key',
  'category',
  'valueType',
  'description',
  'remark',
  'visibility',
  'encrypted',
  isFeatureFlagRelatedConfig,
  'system',
];
function formatConfigValue(record: SystemConfigSummary): string {
  return record.visibility === 'secret' ? '[REDACTED]' : record.value;
}

function isFeatureFlagConfig(record: SystemConfigSummary): boolean {
  return featureFlagConfigKeyPattern.test(record.key);
}

function isFeatureFlagRolloutConfig(record: SystemConfigSummary): boolean {
  return featureFlagRolloutConfigKeyPattern.test(record.key);
}

function isFeatureFlagAudienceConfig(record: SystemConfigSummary): boolean {
  return featureFlagAudienceConfigKeyPattern.test(record.key);
}

function isFeatureFlagRelatedConfig(record: SystemConfigSummary): boolean {
  return (
    isFeatureFlagConfig(record) ||
    isFeatureFlagRolloutConfig(record) ||
    isFeatureFlagAudienceConfig(record)
  );
}

function getFeatureFlagName(record: SystemConfigSummary): string | undefined {
  if (isFeatureFlagConfig(record)) {
    return record.key.slice('feature.'.length, -'.enabled'.length);
  }

  if (isFeatureFlagRolloutConfig(record)) {
    return record.key.slice('feature.'.length, -'.rolloutPercentage'.length);
  }

  if (isFeatureFlagAudienceConfig(record)) {
    return record.key.slice('feature.'.length, -'.audienceRules'.length);
  }

  return undefined;
}

function getFeatureFlagRolloutKey(flagName: string): string {
  return `feature.${flagName}.rolloutPercentage`;
}

function getFeatureFlagAudienceKey(flagName: string): string {
  return `feature.${flagName}.audienceRules`;
}

function findFeatureFlagRolloutRecord(
  rows: readonly SystemConfigSummary[],
  flagName: string,
): SystemConfigSummary | undefined {
  const rolloutKey = getFeatureFlagRolloutKey(flagName);

  return rows.find((record) => record.key === rolloutKey);
}

function findFeatureFlagAudienceRecord(
  rows: readonly SystemConfigSummary[],
  flagName: string,
): SystemConfigSummary | undefined {
  const audienceKey = getFeatureFlagAudienceKey(flagName);

  return rows.find((record) => record.key === audienceKey);
}

function renderFeatureFlagRolloutExportText(
  record: SystemConfigSummary,
): string {
  if (!isFeatureFlagRolloutConfig(record)) {
    return '';
  }

  return `${record.value}%`;
}

function getDefaultAudienceRulesJson(): string {
  return JSON.stringify({ mode: 'all', rules: [] }, null, 2);
}

function normalizeAudienceRulesJson(value: string): string {
  return JSON.stringify(JSON.parse(value));
}

function formatAudienceRules(
  value: string | undefined,
  labels: {
    formatRules: (mode: string, count: number) => string;
    invalidRules: string;
    modeAll: string;
    modeAny: string;
  },
): string {
  if (!value) {
    return labels.formatRules(labels.modeAll, 0);
  }

  try {
    const parsed = JSON.parse(value) as {
      mode?: string;
      rules?: unknown[];
    };
    const mode = parsed.mode === 'any' ? labels.modeAny : labels.modeAll;
    const count = Array.isArray(parsed.rules) ? parsed.rules.length : 0;
    return labels.formatRules(mode, count);
  } catch {
    return labels.invalidRules;
  }
}

function renderValue(record: SystemConfigSummary) {
  const value = formatConfigValue(record);
  return (
    <Typography.Text
      type={record.visibility === 'secret' ? 'secondary' : undefined}
    >
      {value}
    </Typography.Text>
  );
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export default function ConfigPage() {
  const intl = useIntl();
  const access = useAccess();
  const canExportSystemConfig = Boolean(access.canExportSystemConfig);
  const [form] = Form.useForm<ConfigFormValues>();
  const [environmentForm] = Form.useForm<EnvironmentOverrideFormValues>();
  const [secretRotationForm] = Form.useForm<SecretRotationFormValues>();
  const [vaultRotationForm] = Form.useForm<VaultRotationFormValues>();
  const [rows, setRows] = useState<readonly SystemConfigSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [selectedDetail, setSelectedDetail] = useState<SystemConfigSummary>();
  const [editingConfig, setEditingConfig] = useState<SystemConfigSummary>();
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cacheRefreshing, setCacheRefreshing] = useState(false);
  const [exportingConfig, setExportingConfig] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<readonly Key[]>([]);
  const [valueReadingKey, setValueReadingKey] = useState<string>();
  const [featureFlagTogglingKey, setFeatureFlagTogglingKey] =
    useState<string>();
  const [featureFlagRolloutSavingKey, setFeatureFlagRolloutSavingKey] =
    useState<string>();
  const [rolloutConfigTarget, setRolloutConfigTarget] =
    useState<SystemConfigSummary>();
  const [rolloutPercentage, setRolloutPercentage] = useState<number>(100);
  const [featureFlagAudienceSavingKey, setFeatureFlagAudienceSavingKey] =
    useState<string>();
  const [audienceConfigTarget, setAudienceConfigTarget] =
    useState<SystemConfigSummary>();
  const [audienceRulesJson, setAudienceRulesJson] = useState<string>(
    getDefaultAudienceRulesJson(),
  );
  const [environmentConfigTarget, setEnvironmentConfigTarget] =
    useState<SystemConfigSummary>();
  const [environmentOverrideLoading, setEnvironmentOverrideLoading] =
    useState(false);
  const [environmentOverrideSaving, setEnvironmentOverrideSaving] =
    useState(false);
  const [secretConfigTarget, setSecretConfigTarget] =
    useState<SystemConfigSummary>();
  const [secretVersions, setSecretVersions] = useState<
    readonly SystemConfigSecretVersionSummary[]
  >([]);
  const [secretVersionsError, setSecretVersionsError] = useState<string>();
  const [secretVersionsLoading, setSecretVersionsLoading] = useState(false);
  const [secretRotating, setSecretRotating] = useState(false);
  const [vaultStatus, setVaultStatus] =
    useState<SystemConfigVaultStatusSummary>();
  const [vaultStatusError, setVaultStatusError] = useState<string>();
  const [vaultStatusOpen, setVaultStatusOpen] = useState(false);
  const [vaultStatusLoading, setVaultStatusLoading] = useState(false);
  const [vaultKeyRotating, setVaultKeyRotating] = useState(false);
  const watchedVisibility = Form.useWatch('visibility', form);
  const formatMessage = (
    id: string,
    defaultMessage: string,
    values?: Record<string, number | string>,
  ) =>
    values
      ? intl.formatMessage({ id, defaultMessage }, values)
      : intl.formatMessage({ id, defaultMessage });
  const valueTypeLabels: Record<ConfigValueType, string> = {
    boolean: formatMessage('pages.system.config.valueType.boolean', 'boolean'),
    json: formatMessage('pages.system.config.valueType.json', 'json'),
    number: formatMessage('pages.system.config.valueType.number', 'number'),
    string: formatMessage('pages.system.config.valueType.string', 'string'),
  };
  const visibilityLabels: Record<ConfigVisibility, string> = {
    private: formatMessage('pages.system.config.visibility.private', 'private'),
    public: formatMessage('pages.system.config.visibility.public', 'public'),
    secret: formatMessage('pages.system.config.visibility.secret', 'secret'),
  };
  const publicLabels = {
    private: formatMessage('pages.system.config.public.private', 'private'),
    public: formatMessage('pages.system.config.public.public', 'public'),
  };
  const systemLabels = {
    custom: formatMessage('pages.system.config.system.custom', 'custom'),
    system: formatMessage('pages.system.config.system.system', 'system'),
  };
  const vaultLabels = {
    legacySecret: formatMessage(
      'pages.system.config.vault.legacySecret',
      'Legacy secret',
    ),
    plain: formatMessage('pages.system.config.vault.plain', 'plain'),
    plainOrLegacy: formatMessage(
      'pages.system.config.vault.plainOrLegacy',
      'plain or legacy',
    ),
    vaultEncrypted: formatMessage(
      'pages.system.config.vault.encrypted',
      'Vault encrypted',
    ),
  };
  const featureLabels = {
    audience: formatMessage(
      'pages.system.config.feature.audience',
      'audience',
    ),
    invalidRules: formatMessage(
      'pages.system.config.feature.invalidRules',
      'invalid rules',
    ),
    modeAll: formatMessage('pages.system.config.feature.modeAll', 'all'),
    modeAny: formatMessage('pages.system.config.feature.modeAny', 'any'),
    notApplicable: formatMessage(
      'pages.system.config.feature.notApplicable',
      'n/a',
    ),
    rollout: formatMessage('pages.system.config.feature.rollout', 'rollout'),
    runtime: formatMessage('pages.system.config.feature.runtime', 'runtime'),
    standard: formatMessage(
      'pages.system.config.feature.standard',
      'standard',
    ),
    standardConfig: formatMessage(
      'pages.system.config.feature.standardConfig',
      'standard config',
    ),
  };
  const valueTypeOptions: { label: string; value: ConfigValueType }[] = [
    { label: valueTypeLabels.string, value: 'string' },
    { label: valueTypeLabels.json, value: 'json' },
    { label: valueTypeLabels.number, value: 'number' },
    { label: valueTypeLabels.boolean, value: 'boolean' },
  ];
  const visibilityOptions: { label: string; value: ConfigVisibility }[] = [
    { label: visibilityLabels.private, value: 'private' },
    { label: visibilityLabels.public, value: 'public' },
    { label: visibilityLabels.secret, value: 'secret' },
  ];
  const formatAudienceRulesText = (value?: string): string =>
    formatAudienceRules(value, {
      formatRules: (mode, count) =>
        formatMessage(
          count === 1
            ? 'pages.system.config.feature.rulesSummaryOne'
            : 'pages.system.config.feature.rulesSummaryMany',
          count === 1 ? '{mode} / {count} rule' : '{mode} / {count} rules',
          { count, mode },
        ),
      invalidRules: featureLabels.invalidRules,
      modeAll: featureLabels.modeAll,
      modeAny: featureLabels.modeAny,
    });
  const renderVaultExportText = (record: SystemConfigSummary): string => {
    if (record.visibility !== 'secret') {
      return vaultLabels.plain;
    }

    return record.encrypted
      ? vaultLabels.vaultEncrypted
      : vaultLabels.legacySecret;
  };
  const renderFeatureFlagExportText = (
    record: SystemConfigSummary,
  ): string => {
    const flagName = getFeatureFlagName(record);

    if (!flagName) {
      return '';
    }

    return isFeatureFlagConfig(record)
      ? `${flagName}=${record.value}`
      : isFeatureFlagRolloutConfig(record)
        ? `${flagName} ${featureLabels.rollout}`
        : `${flagName} ${featureLabels.audience}`;
  };
  const renderFeatureFlagAudienceExportText = (
    record: SystemConfigSummary,
  ): string => {
    if (!isFeatureFlagAudienceConfig(record)) {
      return '';
    }

    return formatAudienceRulesText(record.value);
  };
  const renderVisibility = (record: SystemConfigSummary) => {
    const color = record.visibility === 'secret' ? 'red' : 'default';
    return <Tag color={color}>{visibilityLabels[record.visibility]}</Tag>;
  };
  const renderVault = (record: SystemConfigSummary) => {
    if (record.visibility !== 'secret') {
      return <Tag>{vaultLabels.plain}</Tag>;
    }

    return (
      <Tag color={record.encrypted ? 'purple' : 'orange'}>
        <LockOutlined />{' '}
        {record.encrypted ? vaultLabels.vaultEncrypted : vaultLabels.legacySecret}
      </Tag>
    );
  };
  const renderSystem = (record: SystemConfigSummary) => (
    <Tag color={record.system ? 'blue' : 'default'}>
      {record.system ? systemLabels.system : systemLabels.custom}
    </Tag>
  );
  const filterOptions: CurrentPageFilterOption<SystemConfigSummary>[] = [
    {
      key: 'category',
      options: createCurrentPageFilterOptions(rows, 'category'),
      placeholder: formatMessage(
        'pages.system.config.filters.category',
        'Category',
      ),
      predicate: (record, value) => record.category === value,
    },
    {
      key: 'valueType',
      options: valueTypeOptions,
      placeholder: formatMessage('pages.system.config.filters.type', 'Type'),
      predicate: (record, value) => record.valueType === value,
    },
    {
      key: 'visibility',
      options: visibilityOptions,
      placeholder: formatMessage(
        'pages.system.config.filters.visibility',
        'Visibility',
      ),
      predicate: (record, value) => record.visibility === value,
    },
    {
      key: 'public',
      options: [
        { label: publicLabels.public, value: 'true' },
        { label: publicLabels.private, value: 'false' },
      ],
      placeholder: formatMessage('pages.system.config.filters.public', 'Public'),
      predicate: (record, value) => record.public === (value === 'true'),
    },
    {
      key: 'encrypted',
      options: [
        { label: vaultLabels.vaultEncrypted, value: 'true' },
        { label: vaultLabels.plainOrLegacy, value: 'false' },
      ],
      placeholder: formatMessage('pages.system.config.filters.vault', 'Vault'),
      predicate: (record, value) => record.encrypted === (value === 'true'),
    },
    {
      key: 'featureFlag',
      options: [
        {
          label: formatMessage(
            'pages.system.config.filters.featureFlagOption',
            'feature flag',
          ),
          value: 'true',
        },
        { label: featureLabels.standardConfig, value: 'false' },
      ],
      placeholder: formatMessage(
        'pages.system.config.filters.featureFlag',
        'Feature flag',
      ),
      predicate: (record, value) =>
        isFeatureFlagRelatedConfig(record) === (value === 'true'),
    },
    {
      key: 'system',
      options: [
        { label: systemLabels.system, value: 'true' },
        { label: systemLabels.custom, value: 'false' },
      ],
      placeholder: formatMessage('pages.system.config.filters.system', 'System'),
      predicate: (record, value) => record.system === (value === 'true'),
    },
  ];
  const exportColumns: CurrentPageExportColumn<SystemConfigSummary>[] = [
    { title: formatMessage('pages.system.config.fields.id', 'ID'), dataIndex: 'id' },
    {
      title: formatMessage('pages.system.config.fields.category', 'Category'),
      dataIndex: 'category',
    },
    {
      title: formatMessage('pages.system.config.fields.name', 'Name'),
      dataIndex: 'name',
    },
    {
      title: formatMessage('pages.system.config.fields.key', 'Key'),
      dataIndex: 'key',
    },
    {
      title: formatMessage('pages.system.config.fields.value', 'Value'),
      renderText: formatConfigValue,
    },
    {
      title: formatMessage('pages.system.config.fields.type', 'Type'),
      renderText: (record) => valueTypeLabels[record.valueType],
    },
    {
      title: formatMessage('pages.system.config.fields.visibility', 'Visibility'),
      renderText: (record) => visibilityLabels[record.visibility],
    },
    {
      title: formatMessage('pages.system.config.fields.vault', 'Vault'),
      renderText: renderVaultExportText,
    },
    {
      title: formatMessage('pages.system.config.fields.public', 'Public'),
      renderText: (record) =>
        record.public ? publicLabels.public : publicLabels.private,
    },
    {
      title: formatMessage(
        'pages.system.config.fields.featureFlag',
        'Feature Flag',
      ),
      renderText: renderFeatureFlagExportText,
    },
    {
      title: formatMessage('pages.system.config.fields.rollout', 'Rollout %'),
      renderText: renderFeatureFlagRolloutExportText,
    },
    {
      title: formatMessage(
        'pages.system.config.fields.audienceRules',
        'Audience Rules',
      ),
      renderText: renderFeatureFlagAudienceExportText,
    },
    {
      title: formatMessage('pages.system.config.fields.system', 'System'),
      renderText: (record) =>
        record.system ? systemLabels.system : systemLabels.custom,
    },
    {
      title: formatMessage('pages.system.config.fields.description', 'Description'),
      dataIndex: 'description',
    },
    {
      title: formatMessage('pages.system.config.fields.remark', 'Remark'),
      dataIndex: 'remark',
    },
  ];
  const createDetailFields = (record: SystemConfigSummary): DetailField[] => [
    { label: formatMessage('pages.system.config.fields.id', 'ID'), value: record.id },
    {
      label: formatMessage('pages.system.config.fields.category', 'Category'),
      value: record.category,
    },
    {
      label: formatMessage('pages.system.config.fields.name', 'Name'),
      value: record.name,
    },
    {
      label: formatMessage('pages.system.config.fields.key', 'Key'),
      value: record.key,
    },
    {
      label: formatMessage('pages.system.config.fields.value', 'Value'),
      sensitive: record.visibility === 'secret',
      value: formatConfigValue(record),
    },
    {
      label: formatMessage('pages.system.config.fields.type', 'Type'),
      value: valueTypeLabels[record.valueType],
    },
    {
      label: formatMessage('pages.system.config.fields.visibility', 'Visibility'),
      value: visibilityLabels[record.visibility],
    },
    {
      label: formatMessage('pages.system.config.fields.vault', 'Vault'),
      value: renderVaultExportText(record),
    },
    {
      label: formatMessage('pages.system.config.fields.public', 'Public'),
      value: record.public ? publicLabels.public : publicLabels.private,
    },
    {
      label: formatMessage(
        'pages.system.config.fields.featureFlag',
        'Feature Flag',
      ),
      value: isFeatureFlagRelatedConfig(record)
        ? renderFeatureFlagExportText(record)
        : featureLabels.standardConfig,
    },
    {
      label: formatMessage('pages.system.config.fields.rollout', 'Rollout %'),
      value: isFeatureFlagRolloutConfig(record) ? `${record.value}%` : '',
    },
    {
      label: formatMessage(
        'pages.system.config.fields.audienceRules',
        'Audience Rules',
      ),
      value: isFeatureFlagAudienceConfig(record)
        ? formatAudienceRulesText(record.value)
        : '',
    },
    {
      label: formatMessage('pages.system.config.fields.system', 'System'),
      value: record.system ? systemLabels.system : systemLabels.custom,
    },
    {
      label: formatMessage('pages.system.config.fields.description', 'Description'),
      value: record.description,
    },
    {
      label: formatMessage('pages.system.config.fields.remark', 'Remark'),
      value: record.remark,
    },
  ];
  const selectedDeletableKeys = useMemo(
    () =>
      selectedRowKeys
        .map(String)
        .filter((key) =>
          rows.some((record) => record.key === key && !record.system),
        ),
    [rows, selectedRowKeys],
  );
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<SystemConfigSummary>({
      rows,
      searchFields,
      searchPlaceholder: formatMessage(
        'pages.system.config.search.placeholder',
        'Search config',
      ),
      selectFilters: filterOptions,
    });
  const valueRequired =
    editingConfig?.visibility !== 'secret' || watchedVisibility !== 'secret';

  const loadConfig = async () => {
    setLoading(true);
    try {
      setRows(await listOpenCoreSystemConfig());
      setLoadError(undefined);
    } catch (error: unknown) {
      setRows([]);
      setSelectedRowKeys([]);
      setSelectedDetail(undefined);
      setEditingConfig(undefined);
      setFormOpen(false);
      setRolloutConfigTarget(undefined);
      setAudienceConfigTarget(undefined);
      setEnvironmentConfigTarget(undefined);
      setSecretConfigTarget(undefined);
      setSecretVersions([]);
      setSecretVersionsError(undefined);
      setLoadError(
        getErrorMessage(
          error,
          formatMessage(
            'pages.system.config.load.failure',
            'Unable to load live system config.',
          ),
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadConfig();
  }, []);

  const openCreateForm = () => {
    setEditingConfig(undefined);
    form.setFieldsValue({
      category: 'system',
      description: '',
      key: '',
      name: '',
      remark: '',
      value: '',
      valueType: 'string',
      visibility: 'private',
    });
    setFormOpen(true);
  };

  const downloadConfigExcelExport = async () => {
    setExportingConfig(true);
    try {
      const exported = await exportOpenCoreSystemConfig();

      if (!exported.contentBase64 || !exported.contentType) {
        message.warning(
          formatMessage(
            'pages.system.config.messages.excelExportUnavailable',
            'Config Excel export is unavailable.',
          ),
        );
        return;
      }

      downloadBase64File(
        exported.filename,
        exported.contentBase64,
        exported.contentType,
      );
      message.success(
        formatMessage(
          'pages.system.config.messages.excelExportDownloaded',
          'Config Excel export downloaded. {rowCount} row(s).',
          { rowCount: exported.rowCount },
        ),
      );
    } finally {
      setExportingConfig(false);
    }
  };

  const openEditForm = async (record: SystemConfigSummary) => {
    try {
      const fresh = await getOpenCoreSystemConfig(record.key);
      setEditingConfig(fresh);
      form.setFieldsValue({
        category: fresh.category,
        description: fresh.description,
        key: fresh.key,
        name: fresh.name,
        remark: fresh.remark,
        value: fresh.visibility === 'secret' ? '' : fresh.value,
        valueType: fresh.valueType,
        visibility: fresh.visibility,
      });
      setFormOpen(true);
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.system.config.open.failure',
              'Unable to open system config.',
            ),
      );
    }
  };

  const openDetail = async (record: SystemConfigSummary) => {
    try {
      setSelectedDetail(await getOpenCoreSystemConfig(record.key));
    } catch (error: unknown) {
      setSelectedDetail(undefined);
      message.error(
        getErrorMessage(
          error,
          formatMessage(
            'pages.system.config.detail.loadFailure',
            'Unable to load live system config detail.',
          ),
        ),
      );
    }
  };

  const submitForm = async () => {
    const values = await form.validateFields();
    const key = values.key.trim();
    const name = values.name.trim();
    const category = values.category.trim();
    const visibility = values.visibility ?? 'private';
    const valueType = values.valueType ?? 'string';
    const value = values.value?.trim() ?? '';
    const commonBody = {
      category,
      description: values.description?.trim() || undefined,
      name,
      public: visibility === 'public',
      remark: values.remark?.trim() || undefined,
      valueType,
      visibility,
    };
    const preserveRedactedSecret =
      Boolean(editingConfig) &&
      editingConfig?.visibility === 'secret' &&
      visibility === 'secret' &&
      value === '';

    setSubmitting(true);
    try {
      if (editingConfig) {
        await updateOpenCoreSystemConfig(editingConfig.key, {
          ...commonBody,
          ...(preserveRedactedSecret ? {} : { value }),
        });
        message.success(
          formatMessage(
            'pages.system.config.messages.updated',
            'System config updated.',
          ),
        );
      } else {
        await createOpenCoreSystemConfig({
          ...commonBody,
          key,
          value,
        });
        message.success(
          formatMessage(
            'pages.system.config.messages.created',
            'System config created.',
          ),
        );
      }
      setFormOpen(false);
      setEditingConfig(undefined);
      await loadConfig();
    } finally {
      setSubmitting(false);
    }
  };

  const deleteConfig = async (record: SystemConfigSummary) => {
    await deleteOpenCoreSystemConfig(record.key);
    message.success(
      formatMessage(
        'pages.system.config.messages.deleted',
        'System config deleted.',
      ),
    );
    await loadConfig();
  };

  const deleteSelectedConfigs = async () => {
    const keys = selectedDeletableKeys;
    if (keys.length === 0) {
      return;
    }

    setBatchDeleting(true);
    try {
      const result = await deleteOpenCoreSystemConfigs({ keys });
      setSelectedRowKeys([]);
      message.success(
        formatMessage(
          'pages.system.config.messages.batchDeleted',
          'Selected configs deleted. {affected} row(s).',
          { affected: result.affected },
        ),
      );
      await loadConfig();
    } finally {
      setBatchDeleting(false);
    }
  };

  const refreshConfigCache = async () => {
    setCacheRefreshing(true);
    try {
      const result = await refreshOpenCoreSystemConfigCache();
      message.success(
        formatMessage(
          'pages.system.config.messages.cacheRefreshed',
          'Config cache refreshed: {cachedKeys} keys.',
          { cachedKeys: result.cachedKeys },
        ),
      );
    } finally {
      setCacheRefreshing(false);
    }
  };

  const readPublicValueByKey = async (record: SystemConfigSummary) => {
    setValueReadingKey(record.key);
    try {
      const result = await getOpenCoreSystemConfigValue(record.key);
      message.info(
        formatMessage(
          'pages.system.config.messages.publicValueRead',
          '{key} = {value}',
          { key: result.key, value: result.value },
        ),
      );
    } finally {
      setValueReadingKey(undefined);
    }
  };

  const openEnvironmentOverride = async (record: SystemConfigSummary) => {
    if (record.visibility !== 'public') {
      return;
    }

    setEnvironmentConfigTarget(record);
    setEnvironmentOverrideLoading(true);
    try {
      const overrides = await listOpenCoreSystemConfigEnvironmentOverrides(
        record.key,
      );
      const stagingOverride = overrides.find(
        (override) => override.environment === 'staging',
      );
      environmentForm.setFieldsValue({
        description: stagingOverride?.description ?? '',
        environment: stagingOverride?.environment ?? 'staging',
        remark: stagingOverride?.remark ?? '',
        value: stagingOverride?.value ?? record.value,
      });
    } catch (error: unknown) {
      setEnvironmentConfigTarget(undefined);
      environmentForm.resetFields();
      message.error(
        getErrorMessage(
          error,
          formatMessage(
            'pages.system.config.environment.loadFailure',
            'Unable to load live config environment overrides.',
          ),
        ),
      );
    } finally {
      setEnvironmentOverrideLoading(false);
    }
  };

  const saveEnvironmentOverride = async () => {
    if (!environmentConfigTarget) {
      return;
    }

    const values = await environmentForm.validateFields();
    const environment = values.environment.trim();
    setEnvironmentOverrideSaving(true);
    try {
      await upsertOpenCoreSystemConfigEnvironmentOverride(
        environmentConfigTarget.key,
        environment,
        {
          description: values.description?.trim() || undefined,
          remark: values.remark?.trim() || undefined,
          value: values.value.trim(),
        },
      );
      message.success(
        formatMessage(
          'pages.system.config.environment.saved',
          'Environment override {environment} saved.',
          { environment },
        ),
      );
      setEnvironmentConfigTarget(undefined);
    } finally {
      setEnvironmentOverrideSaving(false);
    }
  };

  const deleteEnvironmentOverride = async () => {
    if (!environmentConfigTarget) {
      return;
    }

    const environment =
      environmentForm.getFieldValue('environment')?.trim() ?? 'staging';
    setEnvironmentOverrideSaving(true);
    try {
      await deleteOpenCoreSystemConfigEnvironmentOverride(
        environmentConfigTarget.key,
        environment,
      );
      message.success(
        formatMessage(
          'pages.system.config.environment.deleted',
          'Environment override {environment} deleted.',
          { environment },
        ),
      );
      setEnvironmentConfigTarget(undefined);
    } finally {
      setEnvironmentOverrideSaving(false);
    }
  };

  const openSecretVersions = async (record: SystemConfigSummary) => {
    if (record.visibility !== 'secret') {
      return;
    }

    setSecretConfigTarget(record);
    setSecretVersions([]);
    setSecretVersionsError(undefined);
    secretRotationForm.setFieldsValue({
      reason: '',
      rotatedBy: 'admin',
      value: '',
    });
    setSecretVersionsLoading(true);
    try {
      setSecretVersions(
        await listOpenCoreSystemConfigSecretVersions(record.key),
      );
    } catch (error: unknown) {
      setSecretVersions([]);
      const nextError = getErrorMessage(
        error,
        formatMessage(
          'pages.system.config.secretVersions.loadFailure',
          'Unable to load live config secret versions.',
        ),
      );
      setSecretVersionsError(nextError);
      message.error(nextError);
    } finally {
      setSecretVersionsLoading(false);
    }
  };

  const rotateSecret = async () => {
    if (!secretConfigTarget) {
      return;
    }

    const values = await secretRotationForm.validateFields();
    setSecretRotating(true);
    try {
      await rotateOpenCoreSystemConfigSecret(secretConfigTarget.key, {
        reason: values.reason?.trim() || undefined,
        rotatedBy: values.rotatedBy?.trim() || undefined,
        value: values.value,
      });
      message.success(
        formatMessage(
          'pages.system.config.secretVersions.rotated',
          'Secret rotated.',
        ),
      );
      secretRotationForm.setFieldsValue({ reason: '', value: '' });
      setSecretVersions(
        await listOpenCoreSystemConfigSecretVersions(secretConfigTarget.key),
      );
      await loadConfig();
    } finally {
      setSecretRotating(false);
    }
  };

  const openVaultStatus = async () => {
    setVaultStatusOpen(true);
    setVaultStatus(undefined);
    setVaultStatusError(undefined);
    vaultRotationForm.setFieldsValue({
      reason: '',
      rotatedBy: 'admin',
    });
    setVaultStatusLoading(true);
    try {
      setVaultStatus(await getOpenCoreSystemConfigVaultStatus());
    } catch (error: unknown) {
      setVaultStatus(undefined);
      const nextError = getErrorMessage(
        error,
        formatMessage(
          'pages.system.config.vaultStatus.loadFailure',
          'Unable to load live config vault status.',
        ),
      );
      setVaultStatusError(nextError);
      message.error(nextError);
    } finally {
      setVaultStatusLoading(false);
    }
  };

  const rotateVaultKey = async () => {
    const values = await vaultRotationForm.validateFields();
    setVaultKeyRotating(true);
    try {
      const result = await rotateOpenCoreSystemConfigVaultKey({
        reason: values.reason?.trim() || undefined,
        rotatedBy: values.rotatedBy?.trim() || undefined,
      });
      setVaultStatus(result);
      message.success(
        formatMessage(
          'pages.system.config.vaultStatus.rotationResult',
          'Vault key rotation rewrapped {configCount} config(s) and {versionCount} version(s).',
          {
            configCount: result.rewrappedConfigCount,
            versionCount: result.rewrappedSecretVersionCount,
          },
        ),
      );
      await loadConfig();
    } finally {
      setVaultKeyRotating(false);
    }
  };

  const toggleFeatureFlag = async (record: SystemConfigSummary) => {
    if (!isFeatureFlagConfig(record)) {
      return;
    }

    setFeatureFlagTogglingKey(record.key);
    try {
      const nextValue = record.value === 'true' ? 'false' : 'true';
      await updateOpenCoreSystemConfig(record.key, {
        value: nextValue,
        valueType: 'boolean',
        visibility: 'public',
      });
      message.success(
        formatMessage(
          'pages.system.config.feature.flagUpdated',
          'Feature flag {key} updated.',
          { key: record.key },
        ),
      );
      await loadConfig();
    } finally {
      setFeatureFlagTogglingKey(undefined);
    }
  };

  const openFeatureFlagRollout = (record: SystemConfigSummary) => {
    const flagName = getFeatureFlagName(record);

    if (!flagName || !isFeatureFlagConfig(record)) {
      return;
    }

    const rolloutRecord = findFeatureFlagRolloutRecord(rows, flagName);
    const currentPercentage = Number(rolloutRecord?.value ?? '100');
    setRolloutPercentage(
      Number.isInteger(currentPercentage) &&
        currentPercentage >= 0 &&
        currentPercentage <= 100
        ? currentPercentage
        : 100,
    );
    setRolloutConfigTarget(record);
  };

  const saveFeatureFlagRollout = async () => {
    if (!rolloutConfigTarget) {
      return;
    }

    const flagName = getFeatureFlagName(rolloutConfigTarget);

    if (!flagName) {
      return;
    }

    const rolloutKey = getFeatureFlagRolloutKey(flagName);
    const existing = findFeatureFlagRolloutRecord(rows, flagName);
    const nextValue = String(rolloutPercentage);

    setFeatureFlagRolloutSavingKey(rolloutKey);
    try {
      if (existing) {
        await updateOpenCoreSystemConfig(rolloutKey, {
          value: nextValue,
          valueType: 'number',
          visibility: 'public',
        });
      } else {
        await createOpenCoreSystemConfig({
          category: 'feature',
          description: formatMessage(
            'pages.system.config.feature.rolloutDescription',
            'Public rollout percentage for {flagName}.',
            { flagName },
          ),
          key: rolloutKey,
          name: formatMessage(
            'pages.system.config.feature.rolloutName',
            '{name} rollout',
            { name: rolloutConfigTarget.name },
          ),
          value: nextValue,
          valueType: 'number',
          visibility: 'public',
        });
      }
      message.success(
        formatMessage(
          'pages.system.config.feature.rolloutUpdated',
          'Feature rollout {flagName} set to {value}%.',
          { flagName, value: nextValue },
        ),
      );
      setRolloutConfigTarget(undefined);
      await loadConfig();
    } finally {
      setFeatureFlagRolloutSavingKey(undefined);
    }
  };

  const openFeatureFlagAudience = (record: SystemConfigSummary) => {
    const flagName = getFeatureFlagName(record);

    if (!flagName || !isFeatureFlagConfig(record)) {
      return;
    }

    const audienceRecord = findFeatureFlagAudienceRecord(rows, flagName);
    try {
      setAudienceRulesJson(
        audienceRecord?.value
          ? JSON.stringify(JSON.parse(audienceRecord.value), null, 2)
          : getDefaultAudienceRulesJson(),
      );
    } catch {
      setAudienceRulesJson(getDefaultAudienceRulesJson());
    }
    setAudienceConfigTarget(record);
  };

  const saveFeatureFlagAudience = async () => {
    if (!audienceConfigTarget) {
      return;
    }

    const flagName = getFeatureFlagName(audienceConfigTarget);

    if (!flagName) {
      return;
    }

    let nextValue: string;
    try {
      nextValue = normalizeAudienceRulesJson(audienceRulesJson);
    } catch {
      message.error(
        formatMessage(
          'pages.system.config.feature.audienceRulesInvalid',
          'Audience rules must be valid JSON.',
        ),
      );
      return;
    }

    const audienceKey = getFeatureFlagAudienceKey(flagName);
    const existing = findFeatureFlagAudienceRecord(rows, flagName);

    setFeatureFlagAudienceSavingKey(audienceKey);
    try {
      if (existing) {
        await updateOpenCoreSystemConfig(audienceKey, {
          value: nextValue,
          valueType: 'json',
          visibility: 'public',
        });
      } else {
        await createOpenCoreSystemConfig({
          category: 'feature',
          description: formatMessage(
            'pages.system.config.feature.audienceDescription',
            'Public audience targeting rules for {flagName}.',
            { flagName },
          ),
          key: audienceKey,
          name: formatMessage(
            'pages.system.config.feature.audienceName',
            '{name} audience',
            { name: audienceConfigTarget.name },
          ),
          value: nextValue,
          valueType: 'json',
          visibility: 'public',
        });
      }
      message.success(
        formatMessage(
          'pages.system.config.feature.audienceUpdated',
          'Feature audience {flagName} updated.',
          { flagName },
        ),
      );
      setAudienceConfigTarget(undefined);
      await loadConfig();
    } finally {
      setFeatureFlagAudienceSavingKey(undefined);
    }
  };

  const columns: ProColumns<SystemConfigSummary>[] = [
    {
      title: formatMessage('pages.system.config.fields.name', 'Name'),
      dataIndex: 'name',
      ellipsis: true,
      render: (_, record) => (
        <Typography.Link onClick={() => void openDetail(record)}>
          {record.name}
        </Typography.Link>
      ),
    },
    {
      title: formatMessage('pages.system.config.fields.category', 'Category'),
      dataIndex: 'category',
      width: 132,
      render: (_, record) => <Tag>{record.category}</Tag>,
    },
    {
      title: formatMessage('pages.system.config.fields.key', 'Key'),
      dataIndex: 'key',
      ellipsis: true,
    },
    {
      title: formatMessage('pages.system.config.fields.value', 'Value'),
      dataIndex: 'value',
      ellipsis: true,
      render: (_, record) => renderValue(record),
    },
    {
      title: formatMessage('pages.system.config.fields.type', 'Type'),
      dataIndex: 'valueType',
      width: 112,
      render: (_, record) => <Tag>{valueTypeLabels[record.valueType]}</Tag>,
    },
    {
      title: formatMessage('pages.system.config.fields.visibility', 'Visibility'),
      dataIndex: 'visibility',
      width: 124,
      render: (_, record) => renderVisibility(record),
    },
    {
      title: formatMessage('pages.system.config.fields.vault', 'Vault'),
      dataIndex: 'encrypted',
      width: 148,
      render: (_, record) => renderVault(record),
    },
    {
      title: formatMessage('pages.system.config.fields.public', 'Public'),
      dataIndex: 'public',
      width: 96,
      render: (_, record) =>
        record.public ? publicLabels.public : publicLabels.private,
    },
    {
      title: formatMessage(
        'pages.system.config.fields.featureFlag',
        'Feature Flag',
      ),
      dataIndex: 'key',
      width: 156,
      render: (_, record) => {
        const flagName = getFeatureFlagName(record);

        return isFeatureFlagConfig(record) ? (
          <Space size="small">
            <Switch
              aria-label={`Toggle feature flag ${record.key}`}
              checked={record.value === 'true'}
              loading={featureFlagTogglingKey === record.key}
              onChange={() => void toggleFeatureFlag(record)}
              size="small"
            />
            <Tag color="green">{featureLabels.runtime}</Tag>
          </Space>
        ) : flagName ? (
          <Tag color="cyan">
            {flagName}{' '}
            {isFeatureFlagAudienceConfig(record)
              ? featureLabels.audience
              : featureLabels.rollout}
          </Tag>
        ) : (
          <Tag>{featureLabels.standard}</Tag>
        );
      },
    },
    {
      title: formatMessage('pages.system.config.fields.rollout', 'Rollout %'),
      dataIndex: 'key',
      width: 148,
      render: (_, record) => {
        const flagName = getFeatureFlagName(record);

        if (!flagName) {
          return <Tag>{featureLabels.notApplicable}</Tag>;
        }

        const rolloutRecord = findFeatureFlagRolloutRecord(rows, flagName);
        const rolloutValue = isFeatureFlagRolloutConfig(record)
          ? record.value
          : (rolloutRecord?.value ?? '100');

        return (
          <Space size="small">
            <Tag color="cyan">{rolloutValue}%</Tag>
            {isFeatureFlagConfig(record) ? (
              <Tooltip
                title={formatMessage(
                  'pages.system.config.actions.setRollout',
                  'Set rollout',
                )}
              >
                <Button
                  aria-label={formatMessage(
                    'pages.system.config.actions.setRolloutAria',
                    'Set rollout for {key}',
                    { key: record.key },
                  )}
                  icon={<PercentageOutlined />}
                  loading={
                    featureFlagRolloutSavingKey ===
                    getFeatureFlagRolloutKey(flagName)
                  }
                  onClick={() => openFeatureFlagRollout(record)}
                  size="small"
                />
              </Tooltip>
            ) : null}
          </Space>
        );
      },
    },
    {
      title: formatMessage(
        'pages.system.config.fields.audienceRules',
        'Audience Rules',
      ),
      dataIndex: 'key',
      width: 176,
      render: (_, record) => {
        const flagName = getFeatureFlagName(record);

        if (!flagName) {
          return <Tag>{featureLabels.notApplicable}</Tag>;
        }

        const audienceRecord = findFeatureFlagAudienceRecord(rows, flagName);
        const audienceValue = isFeatureFlagAudienceConfig(record)
          ? record.value
          : audienceRecord?.value;

        return (
          <Space size="small">
            <Tag color="geekblue">
              {formatAudienceRulesText(audienceValue)}
            </Tag>
            {isFeatureFlagConfig(record) ? (
              <Tooltip
                title={formatMessage(
                  'pages.system.config.actions.setAudience',
                  'Set audience',
                )}
              >
                <Button
                  aria-label={formatMessage(
                    'pages.system.config.actions.setAudienceAria',
                    'Set audience for {key}',
                    { key: record.key },
                  )}
                  icon={<ApartmentOutlined />}
                  loading={
                    featureFlagAudienceSavingKey ===
                    getFeatureFlagAudienceKey(flagName)
                  }
                  onClick={() => openFeatureFlagAudience(record)}
                  size="small"
                />
              </Tooltip>
            ) : null}
          </Space>
        );
      },
    },
    {
      title: formatMessage('pages.system.config.fields.system', 'System'),
      dataIndex: 'system',
      width: 104,
      render: (_, record) => renderSystem(record),
    },
    {
      title: formatMessage('pages.system.config.fields.description', 'Description'),
      dataIndex: 'description',
      ellipsis: true,
    },
    {
      title: formatMessage('pages.system.config.fields.remark', 'Remark'),
      dataIndex: 'remark',
      ellipsis: true,
    },
    {
      title: formatMessage('pages.system.config.actions.column', 'Actions'),
      valueType: 'option',
      width: 272,
      render: (_, record) => (
        <Space size="small">
          <Tooltip
            title={formatMessage(
              'pages.system.config.actions.detail',
              'Detail',
            )}
          >
            <Button
              aria-label={formatMessage(
                'pages.system.config.actions.viewAria',
                'View {key}',
                { key: record.key },
              )}
              icon={<EyeOutlined />}
              onClick={() => void openDetail(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip
            title={
              record.visibility === 'public'
                ? formatMessage(
                    'pages.system.config.actions.readPublicValue',
                    'Read public value by key',
                  )
                : formatMessage(
                    'pages.system.config.actions.publicValueOnly',
                    'Only public config values can be read by key',
                  )
            }
          >
            <Button
              aria-label={formatMessage(
                'pages.system.config.actions.readPublicValueAria',
                'Read public value {key}',
                { key: record.key },
              )}
              disabled={record.visibility !== 'public'}
              icon={<KeyOutlined />}
              loading={valueReadingKey === record.key}
              onClick={() => void readPublicValueByKey(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip
            title={
              record.visibility === 'public'
                ? formatMessage(
                    'pages.system.config.environment.title',
                    'Environment Override',
                  )
                : formatMessage(
                    'pages.system.config.environment.publicOnly',
                    'Only public config can define environment overrides',
                  )
            }
          >
            <Button
              aria-label={formatMessage(
                'pages.system.config.environment.aria',
                'Environment override {key}',
                { key: record.key },
              )}
              disabled={record.visibility !== 'public'}
              icon={<ApartmentOutlined />}
              onClick={() => void openEnvironmentOverride(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip
            title={
              record.visibility === 'secret'
                ? formatMessage(
                    'pages.system.config.secretVersions.title',
                    'Secret Versions',
                  )
                : formatMessage(
                    'pages.system.config.secretVersions.secretOnly',
                    'Only secret config keeps secret versions',
                  )
            }
          >
            <Button
              aria-label={formatMessage(
                'pages.system.config.secretVersions.aria',
                'Secret versions {key}',
                { key: record.key },
              )}
              disabled={record.visibility !== 'secret'}
              icon={<LockOutlined />}
              onClick={() => void openSecretVersions(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip
            title={formatMessage('pages.system.config.actions.edit', 'Edit')}
          >
            <Button
              aria-label={formatMessage(
                'pages.system.config.actions.editAria',
                'Edit {key}',
                { key: record.key },
              )}
              icon={<EditOutlined />}
              onClick={() => void openEditForm(record)}
              size="small"
            />
          </Tooltip>
          <Popconfirm
            title={formatMessage(
              'pages.system.config.confirm.deleteOne',
              'Delete this system config?',
            )}
            okText={formatMessage('pages.system.config.actions.delete', 'Delete')}
            okButtonProps={{ danger: true }}
            disabled={record.system}
            onConfirm={() => void deleteConfig(record)}
          >
            <Tooltip
              title={
                record.system
                  ? formatMessage(
                      'pages.system.config.actions.systemDeleteLocked',
                      'System built-in configs cannot be deleted',
                    )
                  : formatMessage(
                      'pages.system.config.actions.delete',
                      'Delete',
                    )
              }
            >
              <Button
                aria-label={formatMessage(
                  'pages.system.config.actions.deleteAria',
                  'Delete {key}',
                  { key: record.key },
                )}
                danger
                disabled={record.system}
                icon={<DeleteOutlined />}
                size="small"
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title={formatMessage('pages.system.config.title', 'System Config')}
      subTitle={formatMessage('pages.system.config.section', 'S7 System')}
    >
      {loadError ? (
        <Alert
          showIcon
          type="error"
          message={formatMessage(
            'pages.system.config.load.liveFailure',
            'Unable to load live system config',
          )}
          description={loadError}
          style={{ marginBlockEnd: 16 }}
        />
      ) : null}
      <ProTable<SystemConfigSummary>
        rowKey="key"
        loading={loading}
        search={false}
        options={false}
        toolBarRender={() => [
          filterToolbar,
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreateForm}
          >
            {formatMessage('pages.system.config.actions.new', 'New')}
          </Button>,
          <Button
            key="cache"
            icon={<SyncOutlined spin={cacheRefreshing} />}
            loading={cacheRefreshing}
            onClick={() => void refreshConfigCache()}
          >
            {formatMessage(
              'pages.system.config.actions.refreshCache',
              'Refresh cache',
            )}
          </Button>,
          <Button
            key="vault-key-rotation"
            icon={<KeyOutlined />}
            loading={vaultStatusLoading || vaultKeyRotating}
            onClick={() => void openVaultStatus()}
          >
            {formatMessage(
              'pages.system.config.vaultStatus.title',
              'Vault Key Rotation',
            )}
          </Button>,
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={() => void loadConfig()}
          >
            {formatMessage(
              'pages.system.config.actions.reloadData',
              'Reload data',
            )}
          </Button>,
          <Popconfirm
            key="batch-delete"
            title={formatMessage(
              'pages.system.config.confirm.deleteSelected',
              'Delete {count} selected custom config(s)?',
              { count: selectedDeletableKeys.length },
            )}
            okText={formatMessage('pages.system.config.actions.delete', 'Delete')}
            okButtonProps={{ danger: true }}
            disabled={selectedDeletableKeys.length === 0}
            onConfirm={() => void deleteSelectedConfigs()}
          >
            <Button
              danger
              disabled={selectedDeletableKeys.length === 0}
              icon={<DeleteOutlined />}
              loading={batchDeleting}
            >
              {formatMessage(
                'pages.system.config.actions.deleteSelected',
                'Delete selected',
              )}
            </Button>
          </Popconfirm>,
          <Tooltip
            key="download-config-excel-export"
            title={
              canExportSystemConfig
                ? formatMessage(
                    'pages.system.config.actions.downloadExcel',
                    'Download Excel export',
                  )
                : formatMessage(
                    'pages.system.config.permissions.missingExport',
                    'Missing core:config:export',
                  )
            }
          >
            <Button
              disabled={!canExportSystemConfig}
              icon={<DownloadOutlined />}
              loading={exportingConfig}
              onClick={() => void downloadConfigExcelExport()}
            >
              {formatMessage(
                'pages.system.config.actions.downloadExcelShort',
                'Download Excel',
              )}
            </Button>
          </Tooltip>,
          <CurrentPageExportButton<SystemConfigSummary>
            key="export"
            columns={exportColumns}
            resource="core-config"
            rows={filteredRows}
          />,
        ]}
        pagination={{ pageSize: 10 }}
        dataSource={filteredRows}
        columns={columns}
        rowSelection={{
          selectedRowKeys: [...selectedRowKeys],
          onChange: (keys) => setSelectedRowKeys(keys),
          getCheckboxProps: (record) => ({
            disabled: record.system,
            name: record.key,
          }),
          preserveSelectedRowKeys: true,
        }}
      />
      <ReadOnlyDetailDrawer
        fields={selectedDetail ? createDetailFields(selectedDetail) : []}
        onClose={() => setSelectedDetail(undefined)}
        open={Boolean(selectedDetail)}
        title={
          selectedDetail?.key ??
          formatMessage(
            'pages.system.config.detail.title',
            'System Config Detail',
          )
        }
      />
      <Modal
        title={formatMessage(
          editingConfig
            ? 'pages.system.config.form.editTitle'
            : 'pages.system.config.form.createTitle',
          editingConfig ? 'Edit System Config' : 'New System Config',
        )}
        open={formOpen}
        onCancel={() => {
          setFormOpen(false);
          setEditingConfig(undefined);
        }}
        onOk={() => void submitForm()}
        confirmLoading={submitting}
        okText={
          editingConfig
            ? formatMessage('pages.system.config.actions.save', 'Save')
            : formatMessage('pages.system.config.actions.create', 'Create')
        }
      >
        <Form<ConfigFormValues> form={form} layout="vertical">
          <Form.Item
            label={formatMessage('pages.system.config.fields.name', 'Name')}
            name="name"
            rules={[
              {
                required: true,
                message: formatMessage(
                  'pages.system.config.validation.nameRequired',
                  'Name is required.',
                ),
              },
            ]}
          >
            <Input maxLength={100} />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              'pages.system.config.fields.category',
              'Category',
            )}
            name="category"
            rules={[
              {
                required: true,
                message: formatMessage(
                  'pages.system.config.validation.categoryRequired',
                  'Category is required.',
                ),
              },
            ]}
          >
            <Input maxLength={50} />
          </Form.Item>
          <Form.Item
            label={formatMessage('pages.system.config.fields.key', 'Key')}
            name="key"
            rules={[
              {
                required: true,
                message: formatMessage(
                  'pages.system.config.validation.keyRequired',
                  'Key is required.',
                ),
              },
            ]}
          >
            <Input disabled={Boolean(editingConfig)} maxLength={120} />
          </Form.Item>
          <Form.Item
            label={formatMessage('pages.system.config.fields.value', 'Value')}
            name="value"
            rules={[
              {
                required: valueRequired,
                message: formatMessage(
                  'pages.system.config.validation.valueRequired',
                  'Value is required.',
                ),
              },
            ]}
          >
            <Input.TextArea rows={3} maxLength={500} />
          </Form.Item>
          <Space align="start" size="middle" wrap>
            <Form.Item
              label={formatMessage('pages.system.config.fields.type', 'Type')}
              name="valueType"
              rules={[
                {
                  required: true,
                  message: formatMessage(
                    'pages.system.config.validation.typeRequired',
                    'Type is required.',
                  ),
                },
              ]}
            >
              <Select options={valueTypeOptions} style={{ width: 150 }} />
            </Form.Item>
            <Form.Item
              label={formatMessage(
                'pages.system.config.fields.visibility',
                'Visibility',
              )}
              name="visibility"
              rules={[
                {
                  required: true,
                  message: formatMessage(
                    'pages.system.config.validation.visibilityRequired',
                    'Visibility is required.',
                  ),
                },
              ]}
            >
              <Select options={visibilityOptions} style={{ width: 150 }} />
            </Form.Item>
          </Space>
          <Form.Item
            label={formatMessage(
              'pages.system.config.fields.description',
              'Description',
            )}
            name="description"
          >
            <Input.TextArea maxLength={240} rows={3} />
          </Form.Item>
          <Form.Item
            label={formatMessage('pages.system.config.fields.remark', 'Remark')}
            name="remark"
          >
            <Input.TextArea maxLength={500} rows={3} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title={formatMessage(
          'pages.system.config.environment.title',
          'Environment Override',
        )}
        open={Boolean(environmentConfigTarget)}
        confirmLoading={environmentOverrideSaving}
        onCancel={() => setEnvironmentConfigTarget(undefined)}
        onOk={() => void saveEnvironmentOverride()}
        okText={formatMessage(
          'pages.system.config.environment.save',
          'Save override',
        )}
        footer={[
          <Button
            key="delete"
            danger
            loading={environmentOverrideSaving}
            onClick={() => void deleteEnvironmentOverride()}
          >
            {formatMessage(
              'pages.system.config.environment.delete',
              'Delete override',
            )}
          </Button>,
          <Button
            key="cancel"
            onClick={() => setEnvironmentConfigTarget(undefined)}
          >
            {formatMessage('pages.system.config.actions.cancel', 'Cancel')}
          </Button>,
          <Button
            key="save"
            type="primary"
            loading={environmentOverrideSaving}
            onClick={() => void saveEnvironmentOverride()}
          >
            {formatMessage(
              'pages.system.config.environment.save',
              'Save override',
            )}
          </Button>,
        ]}
      >
        <Alert
          showIcon
          type="info"
          message={formatMessage(
            'pages.system.config.environment.overrides',
            'Environment overrides',
          )}
          description={environmentConfigTarget?.key}
          style={{ marginBlockEnd: 16 }}
        />
        <Form<EnvironmentOverrideFormValues>
          form={environmentForm}
          layout="vertical"
          disabled={environmentOverrideLoading}
        >
          <Form.Item
            label={formatMessage(
              'pages.system.config.fields.environment',
              'Environment',
            )}
            name="environment"
            rules={[
              {
                required: true,
                message: formatMessage(
                  'pages.system.config.validation.environmentRequired',
                  'Environment is required.',
                ),
              },
            ]}
          >
            <Input maxLength={40} />
          </Form.Item>
          <Form.Item
            label={formatMessage('pages.system.config.fields.value', 'Value')}
            name="value"
            rules={[
              {
                required: true,
                message: formatMessage(
                  'pages.system.config.validation.valueRequired',
                  'Value is required.',
                ),
              },
            ]}
          >
            <Input.TextArea rows={3} maxLength={500} />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              'pages.system.config.fields.description',
              'Description',
            )}
            name="description"
          >
            <Input.TextArea maxLength={240} rows={3} />
          </Form.Item>
          <Form.Item
            label={formatMessage('pages.system.config.fields.remark', 'Remark')}
            name="remark"
          >
            <Input.TextArea maxLength={500} rows={3} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title={formatMessage(
          'pages.system.config.secretVersions.title',
          'Secret Versions',
        )}
        open={Boolean(secretConfigTarget)}
        confirmLoading={secretRotating}
        onCancel={() => setSecretConfigTarget(undefined)}
        onOk={() => void rotateSecret()}
        okText={formatMessage(
          'pages.system.config.secretVersions.rotate',
          'Rotate secret',
        )}
      >
        <Alert
          showIcon
          type="info"
          message={formatMessage(
            'pages.system.config.secretVersions.history',
            'Secret version history',
          )}
          description={secretConfigTarget?.key}
          style={{ marginBlockEnd: 16 }}
        />
        <Space direction="vertical" style={{ width: '100%' }}>
          {secretVersionsLoading ? (
            <Typography.Text type="secondary">
              {formatMessage(
                'pages.system.config.secretVersions.loading',
                'Loading versions...',
              )}
            </Typography.Text>
          ) : secretVersionsError ? (
            <Alert
              showIcon
              type="error"
              message={formatMessage(
                'pages.system.config.secretVersions.loadLiveFailure',
                'Unable to load live config secret versions',
              )}
              description={secretVersionsError}
            />
          ) : secretVersions.length === 0 ? (
            <Typography.Text type="secondary">
              {formatMessage(
                'pages.system.config.secretVersions.empty',
                'No secret versions',
              )}
            </Typography.Text>
          ) : (
            secretVersions.map((version) => (
              <Space key={version.id} wrap>
                <Tag color={version.active ? 'green' : 'default'}>
                  v{version.version}
                </Tag>
                <Tag>
                  {version.active
                    ? formatMessage(
                        'pages.system.config.secretVersions.active',
                        'active',
                      )
                    : formatMessage(
                        'pages.system.config.secretVersions.inactive',
                        'inactive',
                      )}
                </Tag>
                <Tag color={version.encrypted ? 'purple' : 'orange'}>
                  {version.envelopeVersion}
                </Tag>
                {version.vaultProvider ? (
                  <Tag>{version.vaultProvider}</Tag>
                ) : null}
                {version.vaultKeyId ? (
                  <Tag color={version.activeVaultKey ? 'green' : 'orange'}>
                    {version.vaultKeyId}
                  </Tag>
                ) : null}
                {version.rotatedBy ? <Tag>{version.rotatedBy}</Tag> : null}
                {version.reason ? (
                  <Typography.Text type="secondary">
                    {version.reason}
                  </Typography.Text>
                ) : null}
                <Typography.Text type="secondary">
                  {version.createdAt}
                </Typography.Text>
              </Space>
            ))
          )}
        </Space>
        <Form<SecretRotationFormValues>
          form={secretRotationForm}
          layout="vertical"
          style={{ marginBlockStart: 16 }}
        >
          <Form.Item
            label={formatMessage(
              'pages.system.config.fields.newSecretValue',
              'New secret value',
            )}
            name="value"
            rules={[
              {
                required: true,
                whitespace: true,
                message: formatMessage(
                  'pages.system.config.validation.newSecretValueRequired',
                  'New secret value is required.',
                ),
              },
            ]}
          >
            <Input.Password autoComplete="new-password" maxLength={500} />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              'pages.system.config.fields.rotatedBy',
              'Rotated by',
            )}
            name="rotatedBy"
          >
            <Input maxLength={100} />
          </Form.Item>
          <Form.Item
            label={formatMessage('pages.system.config.fields.reason', 'Reason')}
            name="reason"
          >
            <Input.TextArea maxLength={500} rows={2} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title={formatMessage(
          'pages.system.config.vaultStatus.title',
          'Vault Key Rotation',
        )}
        open={vaultStatusOpen}
        confirmLoading={vaultKeyRotating}
        onCancel={() => setVaultStatusOpen(false)}
        onOk={() => void rotateVaultKey()}
        okText={formatMessage(
          'pages.system.config.vaultStatus.rotate',
          'Rotate vault key',
        )}
      >
        <Alert
          showIcon
          type={vaultStatusError ? 'error' : 'info'}
          message={formatMessage(
            'pages.system.config.vaultStatus.activeKey',
            'Active vault key',
          )}
          description={
            vaultStatusError ??
            vaultStatus?.activeKeyId ??
            (vaultStatusLoading
              ? formatMessage(
                  'pages.system.config.vaultStatus.loading',
                  'Loading vault status',
                )
              : formatMessage(
                  'pages.system.config.vaultStatus.empty',
                  'No live vault status',
                ))
          }
          style={{ marginBlockEnd: 16 }}
        />
        {vaultStatusError ? null : (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Space wrap>
              <Tag color="blue">
                {formatMessage(
                  'pages.system.config.vaultStatus.managedKmsProvider',
                  'Managed KMS provider',
                )}
              </Tag>
              <Tag
                color={
                  vaultStatus?.provider === 'opencore.http-json'
                    ? 'purple'
                    : 'blue'
                }
              >
                {vaultStatus?.provider ?? 'env'}
              </Tag>
              <Tag>{vaultStatus?.mode ?? 'local'}</Tag>
              <Tag color={vaultStatus?.ready === false ? 'red' : 'green'}>
                {vaultStatus?.ready === false
                  ? formatMessage(
                      'pages.system.config.vaultStatus.kmsNotReady',
                      'KMS not ready',
                    )
                  : formatMessage(
                      'pages.system.config.vaultStatus.kmsReady',
                      'KMS ready',
                    )}
              </Tag>
              <Tag
                color={
                  vaultStatus?.externalEncryptionEnabled ? 'purple' : 'default'
                }
              >
                {vaultStatus?.externalEncryptionEnabled
                  ? formatMessage(
                      'pages.system.config.vaultStatus.externalEncryptionOn',
                      'External encryption on',
                    )
                  : formatMessage(
                      'pages.system.config.vaultStatus.externalEncryptionOff',
                      'External encryption off',
                    )}
              </Tag>
              {vaultStatus?.endpointHost ? (
                <Tag>
                  {formatMessage(
                    'pages.system.config.vaultStatus.endpoint',
                    'KMS endpoint {host}',
                    { host: vaultStatus.endpointHost },
                  )}
                </Tag>
              ) : null}
              <Tag>
                {vaultStatus?.legacyDecryptEnabled
                  ? formatMessage(
                      'pages.system.config.vaultStatus.v1Decrypt',
                      'v1 decrypt',
                    )
                  : formatMessage(
                      'pages.system.config.vaultStatus.v2Only',
                      'v2 only',
                    )}
              </Tag>
              {(vaultStatus?.keyIds ?? []).map((keyId) => (
                <Tag
                  color={
                    keyId === vaultStatus?.activeKeyId ? 'green' : 'default'
                  }
                  key={keyId}
                >
                  {keyId}
                </Tag>
              ))}
            </Space>
            <Space wrap>
              <Tag>
                {formatMessage(
                  'pages.system.config.vaultStatus.configs',
                  'configs {count}',
                  { count: vaultStatus?.encryptedConfigCount ?? 0 },
                )}
              </Tag>
              <Tag>
                {formatMessage(
                  'pages.system.config.vaultStatus.versions',
                  'versions {count}',
                  { count: vaultStatus?.secretVersionCount ?? 0 },
                )}
              </Tag>
              <Tag>
                {formatMessage(
                  'pages.system.config.vaultStatus.activeKeyConfigs',
                  'active key {count}',
                  { count: vaultStatus?.activeKeyConfigCount ?? 0 },
                )}
              </Tag>
              <Tag
                color={vaultStatus?.legacyEnvelopeCount ? 'orange' : 'green'}
              >
                {formatMessage(
                  'pages.system.config.vaultStatus.legacy',
                  'legacy {count}',
                  { count: vaultStatus?.legacyEnvelopeCount ?? 0 },
                )}
              </Tag>
              <Tag
                color={vaultStatus?.staleKeyEnvelopeCount ? 'orange' : 'green'}
              >
                {formatMessage(
                  'pages.system.config.vaultStatus.stale',
                  'stale {count}',
                  { count: vaultStatus?.staleKeyEnvelopeCount ?? 0 },
                )}
              </Tag>
            </Space>
            {vaultStatus?.lastError ? (
              <Alert
                showIcon
                type="warning"
                message={formatMessage(
                  'pages.system.config.vaultStatus.providerNotReady',
                  'Managed KMS provider not ready',
                )}
                description={vaultStatus.lastError}
              />
            ) : null}
          </Space>
        )}
        <Form<VaultRotationFormValues>
          form={vaultRotationForm}
          layout="vertical"
          style={{ marginBlockStart: 16 }}
        >
          <Form.Item
            label={formatMessage(
              'pages.system.config.fields.rotatedBy',
              'Rotated by',
            )}
            name="rotatedBy"
          >
            <Input maxLength={100} />
          </Form.Item>
          <Form.Item
            label={formatMessage('pages.system.config.fields.reason', 'Reason')}
            name="reason"
          >
            <Input.TextArea maxLength={500} rows={2} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title={formatMessage(
          'pages.system.config.feature.rolloutTitle',
          'Feature rollout',
        )}
        open={Boolean(rolloutConfigTarget)}
        onCancel={() => setRolloutConfigTarget(undefined)}
        onOk={() => void saveFeatureFlagRollout()}
        confirmLoading={Boolean(featureFlagRolloutSavingKey)}
        okText={formatMessage(
          'pages.system.config.actions.setRollout',
          'Set rollout',
        )}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Typography.Text strong>
            {rolloutConfigTarget
              ? getFeatureFlagName(rolloutConfigTarget)
              : formatMessage(
                  'pages.system.config.feature.featureFlag',
                  'feature flag',
                )}
          </Typography.Text>
          <InputNumber
            aria-label={formatMessage(
              'pages.system.config.feature.rolloutPercentageAria',
              'Feature rollout percentage',
            )}
            addonAfter="%"
            max={100}
            min={0}
            onChange={(value) =>
              setRolloutPercentage(typeof value === 'number' ? value : 100)
            }
            precision={0}
            style={{ width: '100%' }}
            value={rolloutPercentage}
          />
        </Space>
      </Modal>
      <Modal
        title={formatMessage(
          'pages.system.config.feature.audienceTitle',
          'Feature audience',
        )}
        open={Boolean(audienceConfigTarget)}
        onCancel={() => setAudienceConfigTarget(undefined)}
        onOk={() => void saveFeatureFlagAudience()}
        confirmLoading={Boolean(featureFlagAudienceSavingKey)}
        okText={formatMessage(
          'pages.system.config.actions.setAudience',
          'Set audience',
        )}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Typography.Text strong>
            {audienceConfigTarget
              ? getFeatureFlagName(audienceConfigTarget)
              : formatMessage(
                  'pages.system.config.feature.featureFlag',
                  'feature flag',
                )}
          </Typography.Text>
          <Input.TextArea
            aria-label={formatMessage(
              'pages.system.config.feature.audienceRulesAria',
              'Feature audience rules',
            )}
            rows={8}
            value={audienceRulesJson}
            onChange={(event) => setAudienceRulesJson(event.target.value)}
          />
        </Space>
      </Modal>
    </PageContainer>
  );
}
