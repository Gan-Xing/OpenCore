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
import { useAccess } from '@umijs/max';
import {
  createSystemConfigFixtures,
  type SystemConfigSecretVersionSummary,
  type SystemConfigSummary,
  type SystemConfigVaultStatusSummary,
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

const fallbackRows = createSystemConfigFixtures().items;
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
const exportColumns: CurrentPageExportColumn<SystemConfigSummary>[] = [
  { title: 'ID', dataIndex: 'id' },
  { title: 'Category', dataIndex: 'category' },
  { title: 'Name', dataIndex: 'name' },
  { title: 'Key', dataIndex: 'key' },
  {
    title: 'Value',
    renderText: formatConfigValue,
  },
  { title: 'Type', dataIndex: 'valueType' },
  { title: 'Visibility', dataIndex: 'visibility' },
  { title: 'Vault', renderText: renderVaultExportText },
  { title: 'Public', dataIndex: 'public' },
  { title: 'Feature Flag', renderText: renderFeatureFlagExportText },
  { title: 'Rollout %', renderText: renderFeatureFlagRolloutExportText },
  { title: 'Audience Rules', renderText: renderFeatureFlagAudienceExportText },
  { title: 'System', dataIndex: 'system' },
  { title: 'Description', dataIndex: 'description' },
  { title: 'Remark', dataIndex: 'remark' },
];
const valueTypeOptions: { label: string; value: ConfigValueType }[] = [
  { label: 'string', value: 'string' },
  { label: 'json', value: 'json' },
  { label: 'number', value: 'number' },
  { label: 'boolean', value: 'boolean' },
];
const visibilityOptions: { label: string; value: ConfigVisibility }[] = [
  { label: 'private', value: 'private' },
  { label: 'public', value: 'public' },
  { label: 'secret', value: 'secret' },
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

function renderFeatureFlagExportText(record: SystemConfigSummary): string {
  const flagName = getFeatureFlagName(record);

  if (!flagName) {
    return '';
  }

  return isFeatureFlagConfig(record)
    ? `${flagName}=${record.value}`
    : isFeatureFlagRolloutConfig(record)
      ? `${flagName} rollout`
      : `${flagName} audience`;
}

function renderFeatureFlagRolloutExportText(
  record: SystemConfigSummary,
): string {
  if (!isFeatureFlagRolloutConfig(record)) {
    return '';
  }

  return `${record.value}%`;
}

function renderFeatureFlagAudienceExportText(
  record: SystemConfigSummary,
): string {
  if (!isFeatureFlagAudienceConfig(record)) {
    return '';
  }

  return formatAudienceRules(record.value);
}

function getDefaultAudienceRulesJson(): string {
  return JSON.stringify({ mode: 'all', rules: [] }, null, 2);
}

function normalizeAudienceRulesJson(value: string): string {
  return JSON.stringify(JSON.parse(value));
}

function formatAudienceRules(value?: string): string {
  if (!value) {
    return 'all / 0 rules';
  }

  try {
    const parsed = JSON.parse(value) as {
      mode?: string;
      rules?: unknown[];
    };
    const mode = parsed.mode === 'any' ? 'any' : 'all';
    const count = Array.isArray(parsed.rules) ? parsed.rules.length : 0;
    return `${mode} / ${count} rule${count === 1 ? '' : 's'}`;
  } catch {
    return 'invalid rules';
  }
}

function renderVaultExportText(record: SystemConfigSummary): string {
  if (record.visibility !== 'secret') {
    return 'plain';
  }

  return record.encrypted ? 'vault encrypted' : 'legacy secret';
}

function createFilterOptions(
  rows: readonly SystemConfigSummary[],
): CurrentPageFilterOption<SystemConfigSummary>[] {
  return [
    {
      key: 'category',
      options: createCurrentPageFilterOptions(rows, 'category'),
      placeholder: 'Category',
      predicate: (record, value) => record.category === value,
    },
    {
      key: 'valueType',
      options: createCurrentPageFilterOptions(rows, 'valueType'),
      placeholder: 'Type',
      predicate: (record, value) => record.valueType === value,
    },
    {
      key: 'visibility',
      options: createCurrentPageFilterOptions(rows, 'visibility'),
      placeholder: 'Visibility',
      predicate: (record, value) => record.visibility === value,
    },
    {
      key: 'public',
      options: [
        { label: 'public', value: 'true' },
        { label: 'private', value: 'false' },
      ],
      placeholder: 'Public',
      predicate: (record, value) => record.public === (value === 'true'),
    },
    {
      key: 'encrypted',
      options: [
        { label: 'vault encrypted', value: 'true' },
        { label: 'plain or legacy', value: 'false' },
      ],
      placeholder: 'Vault',
      predicate: (record, value) => record.encrypted === (value === 'true'),
    },
    {
      key: 'featureFlag',
      options: [
        { label: 'feature flag', value: 'true' },
        { label: 'standard config', value: 'false' },
      ],
      placeholder: 'Feature flag',
      predicate: (record, value) =>
        isFeatureFlagRelatedConfig(record) === (value === 'true'),
    },
    {
      key: 'system',
      options: [
        { label: 'system', value: 'true' },
        { label: 'custom', value: 'false' },
      ],
      placeholder: 'System',
      predicate: (record, value) => record.system === (value === 'true'),
    },
  ];
}

function createDetailFields(record: SystemConfigSummary): DetailField[] {
  return [
    { label: 'ID', value: record.id },
    { label: 'Category', value: record.category },
    { label: 'Name', value: record.name },
    { label: 'Key', value: record.key },
    {
      label: 'Value',
      sensitive: record.visibility === 'secret',
      value: formatConfigValue(record),
    },
    { label: 'Type', value: record.valueType },
    { label: 'Visibility', value: record.visibility },
    { label: 'Vault', value: renderVaultExportText(record) },
    { label: 'Public', value: record.public ? 'public' : 'private' },
    {
      label: 'Feature Flag',
      value: isFeatureFlagRelatedConfig(record)
        ? renderFeatureFlagExportText(record)
        : 'standard config',
    },
    {
      label: 'Rollout %',
      value: isFeatureFlagRolloutConfig(record) ? `${record.value}%` : '',
    },
    {
      label: 'Audience Rules',
      value: isFeatureFlagAudienceConfig(record)
        ? formatAudienceRules(record.value)
        : '',
    },
    { label: 'System', value: record.system ? 'system' : 'custom' },
    { label: 'Description', value: record.description },
    { label: 'Remark', value: record.remark },
  ];
}

function renderVisibility(record: SystemConfigSummary) {
  const color = record.visibility === 'secret' ? 'red' : 'default';
  return <Tag color={color}>{record.visibility}</Tag>;
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

function renderVault(record: SystemConfigSummary) {
  if (record.visibility !== 'secret') {
    return <Tag>plain</Tag>;
  }

  return (
    <Tag color={record.encrypted ? 'purple' : 'orange'}>
      <LockOutlined /> {record.encrypted ? 'Vault encrypted' : 'Legacy secret'}
    </Tag>
  );
}

function renderSystem(record: SystemConfigSummary) {
  return (
    <Tag color={record.system ? 'blue' : 'default'}>
      {record.system ? 'system' : 'custom'}
    </Tag>
  );
}

export default function ConfigPage() {
  const access = useAccess();
  const canExportSystemConfig = Boolean(access.canExportSystemConfig);
  const [form] = Form.useForm<ConfigFormValues>();
  const [environmentForm] = Form.useForm<EnvironmentOverrideFormValues>();
  const [secretRotationForm] = Form.useForm<SecretRotationFormValues>();
  const [vaultRotationForm] = Form.useForm<VaultRotationFormValues>();
  const [rows, setRows] =
    useState<readonly SystemConfigSummary[]>(fallbackRows);
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
  const [secretVersionsLoading, setSecretVersionsLoading] = useState(false);
  const [secretRotating, setSecretRotating] = useState(false);
  const [vaultStatus, setVaultStatus] =
    useState<SystemConfigVaultStatusSummary>();
  const [vaultStatusOpen, setVaultStatusOpen] = useState(false);
  const [vaultStatusLoading, setVaultStatusLoading] = useState(false);
  const [vaultKeyRotating, setVaultKeyRotating] = useState(false);
  const watchedVisibility = Form.useWatch('visibility', form);
  const filterOptions = useMemo(() => createFilterOptions(rows), [rows]);
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
      searchPlaceholder: 'Search config',
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
      setRows(fallbackRows);
      setLoadError(
        error instanceof Error
          ? error.message
          : 'Unable to load system config.',
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
        message.warning('Config Excel export is unavailable.');
        return;
      }

      downloadBase64File(
        exported.filename,
        exported.contentBase64,
        exported.contentType,
      );
      message.success(
        `Config Excel export downloaded. ${exported.rowCount} row(s).`,
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
          : 'Unable to open system config.',
      );
    }
  };

  const openDetail = async (record: SystemConfigSummary) => {
    try {
      setSelectedDetail(await getOpenCoreSystemConfig(record.key));
    } catch (_error) {
      setSelectedDetail(record);
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
        message.success('System config updated.');
      } else {
        await createOpenCoreSystemConfig({
          ...commonBody,
          key,
          value,
        });
        message.success('System config created.');
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
    message.success('System config deleted.');
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
      message.success(`Selected configs deleted. ${result.affected} row(s).`);
      await loadConfig();
    } finally {
      setBatchDeleting(false);
    }
  };

  const refreshConfigCache = async () => {
    setCacheRefreshing(true);
    try {
      const result = await refreshOpenCoreSystemConfigCache();
      message.success(`Config cache refreshed: ${result.cachedKeys} keys.`);
    } finally {
      setCacheRefreshing(false);
    }
  };

  const readPublicValueByKey = async (record: SystemConfigSummary) => {
    setValueReadingKey(record.key);
    try {
      const result = await getOpenCoreSystemConfigValue(record.key);
      message.info(`${result.key} = ${result.value}`);
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
      environmentForm.setFieldsValue({
        description: '',
        environment: 'staging',
        remark: '',
        value: record.value,
      });
      message.warning(
        error instanceof Error
          ? error.message
          : 'Unable to load environment overrides.',
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
      message.success(`Environment override ${environment} saved.`);
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
      message.success(`Environment override ${environment} deleted.`);
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
      message.warning(
        error instanceof Error
          ? error.message
          : 'Unable to load secret versions.',
      );
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
      message.success('Secret rotated.');
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
    vaultRotationForm.setFieldsValue({
      reason: '',
      rotatedBy: 'admin',
    });
    setVaultStatusLoading(true);
    try {
      setVaultStatus(await getOpenCoreSystemConfigVaultStatus());
    } catch (error: unknown) {
      message.warning(
        error instanceof Error ? error.message : 'Unable to load vault status.',
      );
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
        `Vault key rotation rewrapped ${result.rewrappedConfigCount} config(s) and ${result.rewrappedSecretVersionCount} version(s).`,
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
      message.success(`Feature flag ${record.key} updated.`);
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
          description: `Public rollout percentage for ${flagName}.`,
          key: rolloutKey,
          name: `${rolloutConfigTarget.name} rollout`,
          value: nextValue,
          valueType: 'number',
          visibility: 'public',
        });
      }
      message.success(`Feature rollout ${flagName} set to ${nextValue}%.`);
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
      message.error('Audience rules must be valid JSON.');
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
          description: `Public audience targeting rules for ${flagName}.`,
          key: audienceKey,
          name: `${audienceConfigTarget.name} audience`,
          value: nextValue,
          valueType: 'json',
          visibility: 'public',
        });
      }
      message.success(`Feature audience ${flagName} updated.`);
      setAudienceConfigTarget(undefined);
      await loadConfig();
    } finally {
      setFeatureFlagAudienceSavingKey(undefined);
    }
  };

  const columns: ProColumns<SystemConfigSummary>[] = [
    {
      title: 'Name',
      dataIndex: 'name',
      ellipsis: true,
      render: (_, record) => (
        <Typography.Link onClick={() => void openDetail(record)}>
          {record.name}
        </Typography.Link>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      width: 132,
      render: (_, record) => <Tag>{record.category}</Tag>,
    },
    {
      title: 'Key',
      dataIndex: 'key',
      ellipsis: true,
    },
    {
      title: 'Value',
      dataIndex: 'value',
      ellipsis: true,
      render: (_, record) => renderValue(record),
    },
    {
      title: 'Type',
      dataIndex: 'valueType',
      width: 112,
      render: (_, record) => <Tag>{record.valueType}</Tag>,
    },
    {
      title: 'Visibility',
      dataIndex: 'visibility',
      width: 124,
      render: (_, record) => renderVisibility(record),
    },
    {
      title: 'Vault',
      dataIndex: 'encrypted',
      width: 148,
      render: (_, record) => renderVault(record),
    },
    {
      title: 'Public',
      dataIndex: 'public',
      width: 96,
      render: (_, record) => (record.public ? 'public' : 'private'),
    },
    {
      title: 'Feature Flag',
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
            <Tag color="green">runtime</Tag>
          </Space>
        ) : flagName ? (
          <Tag color="cyan">
            {flagName}{' '}
            {isFeatureFlagAudienceConfig(record) ? 'audience' : 'rollout'}
          </Tag>
        ) : (
          <Tag>standard</Tag>
        );
      },
    },
    {
      title: 'Rollout %',
      dataIndex: 'key',
      width: 148,
      render: (_, record) => {
        const flagName = getFeatureFlagName(record);

        if (!flagName) {
          return <Tag>n/a</Tag>;
        }

        const rolloutRecord = findFeatureFlagRolloutRecord(rows, flagName);
        const rolloutValue = isFeatureFlagRolloutConfig(record)
          ? record.value
          : (rolloutRecord?.value ?? '100');

        return (
          <Space size="small">
            <Tag color="cyan">{rolloutValue}%</Tag>
            {isFeatureFlagConfig(record) ? (
              <Tooltip title="Set rollout">
                <Button
                  aria-label={`Set rollout for ${record.key}`}
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
      title: 'Audience Rules',
      dataIndex: 'key',
      width: 176,
      render: (_, record) => {
        const flagName = getFeatureFlagName(record);

        if (!flagName) {
          return <Tag>n/a</Tag>;
        }

        const audienceRecord = findFeatureFlagAudienceRecord(rows, flagName);
        const audienceValue = isFeatureFlagAudienceConfig(record)
          ? record.value
          : audienceRecord?.value;

        return (
          <Space size="small">
            <Tag color="geekblue">{formatAudienceRules(audienceValue)}</Tag>
            {isFeatureFlagConfig(record) ? (
              <Tooltip title="Set audience">
                <Button
                  aria-label={`Set audience for ${record.key}`}
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
      title: 'System',
      dataIndex: 'system',
      width: 104,
      render: (_, record) => renderSystem(record),
    },
    { title: 'Description', dataIndex: 'description', ellipsis: true },
    { title: 'Remark', dataIndex: 'remark', ellipsis: true },
    {
      title: 'Actions',
      valueType: 'option',
      width: 272,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Detail">
            <Button
              aria-label={`View ${record.key}`}
              icon={<EyeOutlined />}
              onClick={() => void openDetail(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip
            title={
              record.visibility === 'public'
                ? 'Read public value by key'
                : 'Only public config values can be read by key'
            }
          >
            <Button
              aria-label={`Read public value ${record.key}`}
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
                ? 'Environment Override'
                : 'Only public config can define environment overrides'
            }
          >
            <Button
              aria-label={`Environment override ${record.key}`}
              disabled={record.visibility !== 'public'}
              icon={<ApartmentOutlined />}
              onClick={() => void openEnvironmentOverride(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip
            title={
              record.visibility === 'secret'
                ? 'Secret Versions'
                : 'Only secret config keeps secret versions'
            }
          >
            <Button
              aria-label={`Secret versions ${record.key}`}
              disabled={record.visibility !== 'secret'}
              icon={<LockOutlined />}
              onClick={() => void openSecretVersions(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              aria-label={`Edit ${record.key}`}
              icon={<EditOutlined />}
              onClick={() => void openEditForm(record)}
              size="small"
            />
          </Tooltip>
          <Popconfirm
            title="Delete this system config?"
            okText="Delete"
            okButtonProps={{ danger: true }}
            disabled={record.system}
            onConfirm={() => void deleteConfig(record)}
          >
            <Tooltip
              title={
                record.system
                  ? 'System built-in configs cannot be deleted'
                  : 'Delete'
              }
            >
              <Button
                aria-label={`Delete ${record.key}`}
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
    <PageContainer title="System Config" subTitle="S7 System">
      {loadError ? (
        <Alert
          showIcon
          type="warning"
          message="Using fallback config snapshot"
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
            New
          </Button>,
          <Button
            key="cache"
            icon={<SyncOutlined spin={cacheRefreshing} />}
            loading={cacheRefreshing}
            onClick={() => void refreshConfigCache()}
          >
            Refresh cache
          </Button>,
          <Button
            key="vault-key-rotation"
            icon={<KeyOutlined />}
            loading={vaultStatusLoading || vaultKeyRotating}
            onClick={() => void openVaultStatus()}
          >
            Vault Key Rotation
          </Button>,
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={() => void loadConfig()}
          >
            Reload data
          </Button>,
          <Popconfirm
            key="batch-delete"
            title={`Delete ${selectedDeletableKeys.length} selected custom config(s)?`}
            okText="Delete"
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
              Delete selected
            </Button>
          </Popconfirm>,
          <Tooltip
            key="download-config-excel-export"
            title={
              canExportSystemConfig
                ? 'Download Excel export'
                : 'Missing core:config:export'
            }
          >
            <Button
              disabled={!canExportSystemConfig}
              icon={<DownloadOutlined />}
              loading={exportingConfig}
              onClick={() => void downloadConfigExcelExport()}
            >
              Download Excel
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
        title={selectedDetail?.key ?? 'System Config Detail'}
      />
      <Modal
        title={editingConfig ? 'Edit System Config' : 'New System Config'}
        open={formOpen}
        onCancel={() => {
          setFormOpen(false);
          setEditingConfig(undefined);
        }}
        onOk={() => void submitForm()}
        confirmLoading={submitting}
        okText={editingConfig ? 'Save' : 'Create'}
      >
        <Form<ConfigFormValues> form={form} layout="vertical">
          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: 'Name is required.' }]}
          >
            <Input maxLength={100} />
          </Form.Item>
          <Form.Item
            label="Category"
            name="category"
            rules={[{ required: true, message: 'Category is required.' }]}
          >
            <Input maxLength={50} />
          </Form.Item>
          <Form.Item
            label="Key"
            name="key"
            rules={[{ required: true, message: 'Key is required.' }]}
          >
            <Input disabled={Boolean(editingConfig)} maxLength={120} />
          </Form.Item>
          <Form.Item
            label="Value"
            name="value"
            rules={[{ required: valueRequired, message: 'Value is required.' }]}
          >
            <Input.TextArea rows={3} maxLength={500} />
          </Form.Item>
          <Space align="start" size="middle" wrap>
            <Form.Item
              label="Type"
              name="valueType"
              rules={[{ required: true, message: 'Type is required.' }]}
            >
              <Select options={valueTypeOptions} style={{ width: 150 }} />
            </Form.Item>
            <Form.Item
              label="Visibility"
              name="visibility"
              rules={[{ required: true, message: 'Visibility is required.' }]}
            >
              <Select options={visibilityOptions} style={{ width: 150 }} />
            </Form.Item>
          </Space>
          <Form.Item label="Description" name="description">
            <Input.TextArea maxLength={240} rows={3} />
          </Form.Item>
          <Form.Item label="Remark" name="remark">
            <Input.TextArea maxLength={500} rows={3} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="Environment Override"
        open={Boolean(environmentConfigTarget)}
        confirmLoading={environmentOverrideSaving}
        onCancel={() => setEnvironmentConfigTarget(undefined)}
        onOk={() => void saveEnvironmentOverride()}
        okText="Save override"
        footer={[
          <Button
            key="delete"
            danger
            loading={environmentOverrideSaving}
            onClick={() => void deleteEnvironmentOverride()}
          >
            Delete override
          </Button>,
          <Button
            key="cancel"
            onClick={() => setEnvironmentConfigTarget(undefined)}
          >
            Cancel
          </Button>,
          <Button
            key="save"
            type="primary"
            loading={environmentOverrideSaving}
            onClick={() => void saveEnvironmentOverride()}
          >
            Save override
          </Button>,
        ]}
      >
        <Alert
          showIcon
          type="info"
          message="Environment overrides"
          description={environmentConfigTarget?.key}
          style={{ marginBlockEnd: 16 }}
        />
        <Form<EnvironmentOverrideFormValues>
          form={environmentForm}
          layout="vertical"
          disabled={environmentOverrideLoading}
        >
          <Form.Item
            label="Environment"
            name="environment"
            rules={[{ required: true, message: 'Environment is required.' }]}
          >
            <Input maxLength={40} />
          </Form.Item>
          <Form.Item
            label="Value"
            name="value"
            rules={[{ required: true, message: 'Value is required.' }]}
          >
            <Input.TextArea rows={3} maxLength={500} />
          </Form.Item>
          <Form.Item label="Description" name="description">
            <Input.TextArea maxLength={240} rows={3} />
          </Form.Item>
          <Form.Item label="Remark" name="remark">
            <Input.TextArea maxLength={500} rows={3} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="Secret Versions"
        open={Boolean(secretConfigTarget)}
        confirmLoading={secretRotating}
        onCancel={() => setSecretConfigTarget(undefined)}
        onOk={() => void rotateSecret()}
        okText="Rotate secret"
      >
        <Alert
          showIcon
          type="info"
          message="Secret version history"
          description={secretConfigTarget?.key}
          style={{ marginBlockEnd: 16 }}
        />
        <Space direction="vertical" style={{ width: '100%' }}>
          {secretVersionsLoading ? (
            <Typography.Text type="secondary">
              Loading versions...
            </Typography.Text>
          ) : secretVersions.length === 0 ? (
            <Typography.Text type="secondary">
              No secret versions
            </Typography.Text>
          ) : (
            secretVersions.map((version) => (
              <Space key={version.id} wrap>
                <Tag color={version.active ? 'green' : 'default'}>
                  v{version.version}
                </Tag>
                <Tag>{version.active ? 'active' : 'inactive'}</Tag>
                <Tag color={version.encrypted ? 'purple' : 'orange'}>
                  {version.envelopeVersion}
                </Tag>
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
            label="New secret value"
            name="value"
            rules={[
              {
                required: true,
                whitespace: true,
                message: 'New secret value is required.',
              },
            ]}
          >
            <Input.Password autoComplete="new-password" maxLength={500} />
          </Form.Item>
          <Form.Item label="Rotated by" name="rotatedBy">
            <Input maxLength={100} />
          </Form.Item>
          <Form.Item label="Reason" name="reason">
            <Input.TextArea maxLength={500} rows={2} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="Vault Key Rotation"
        open={vaultStatusOpen}
        confirmLoading={vaultKeyRotating}
        onCancel={() => setVaultStatusOpen(false)}
        onOk={() => void rotateVaultKey()}
        okText="Rotate vault key"
      >
        <Alert
          showIcon
          type="info"
          message="Active vault key"
          description={vaultStatus?.activeKeyId ?? 'Loading vault status'}
          style={{ marginBlockEnd: 16 }}
        />
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space wrap>
            <Tag color="blue">{vaultStatus?.provider ?? 'env'}</Tag>
            <Tag>
              {vaultStatus?.legacyDecryptEnabled ? 'v1 decrypt' : 'v2 only'}
            </Tag>
            {(vaultStatus?.keyIds ?? []).map((keyId) => (
              <Tag
                color={keyId === vaultStatus?.activeKeyId ? 'green' : 'default'}
                key={keyId}
              >
                {keyId}
              </Tag>
            ))}
          </Space>
          <Space wrap>
            <Tag>configs {vaultStatus?.encryptedConfigCount ?? 0}</Tag>
            <Tag>versions {vaultStatus?.secretVersionCount ?? 0}</Tag>
            <Tag>active key {vaultStatus?.activeKeyConfigCount ?? 0}</Tag>
            <Tag color={vaultStatus?.legacyEnvelopeCount ? 'orange' : 'green'}>
              legacy {vaultStatus?.legacyEnvelopeCount ?? 0}
            </Tag>
            <Tag
              color={vaultStatus?.staleKeyEnvelopeCount ? 'orange' : 'green'}
            >
              stale {vaultStatus?.staleKeyEnvelopeCount ?? 0}
            </Tag>
          </Space>
        </Space>
        <Form<VaultRotationFormValues>
          form={vaultRotationForm}
          layout="vertical"
          style={{ marginBlockStart: 16 }}
        >
          <Form.Item label="Rotated by" name="rotatedBy">
            <Input maxLength={100} />
          </Form.Item>
          <Form.Item label="Reason" name="reason">
            <Input.TextArea maxLength={500} rows={2} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="Feature rollout"
        open={Boolean(rolloutConfigTarget)}
        onCancel={() => setRolloutConfigTarget(undefined)}
        onOk={() => void saveFeatureFlagRollout()}
        confirmLoading={Boolean(featureFlagRolloutSavingKey)}
        okText="Set rollout"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Typography.Text strong>
            {rolloutConfigTarget
              ? getFeatureFlagName(rolloutConfigTarget)
              : 'feature flag'}
          </Typography.Text>
          <InputNumber
            aria-label="Feature rollout percentage"
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
        title="Feature audience"
        open={Boolean(audienceConfigTarget)}
        onCancel={() => setAudienceConfigTarget(undefined)}
        onOk={() => void saveFeatureFlagAudience()}
        confirmLoading={Boolean(featureFlagAudienceSavingKey)}
        okText="Set audience"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Typography.Text strong>
            {audienceConfigTarget
              ? getFeatureFlagName(audienceConfigTarget)
              : 'feature flag'}
          </Typography.Text>
          <Input.TextArea
            aria-label="Feature audience rules"
            rows={8}
            value={audienceRulesJson}
            onChange={(event) => setAudienceRulesJson(event.target.value)}
          />
        </Space>
      </Modal>
    </PageContainer>
  );
}
