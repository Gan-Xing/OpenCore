import {
  ClearOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import { useAccess } from '@umijs/max';
import type {
  CacheKeySummary,
  CacheNameSummary,
  CacheValueSummary,
} from '@opencore/sdk';
import {
  Alert,
  Button,
  Modal,
  Space,
  Statistic,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import {
  clearOpenCoreCache,
  deleteOpenCoreCacheKey,
  getOpenCoreCacheValue,
  listOpenCoreCacheKeys,
  listOpenCoreCacheNames,
} from '@/services/opencore/platform';
import {
  CurrentPageExportButton,
  type CurrentPageExportColumn,
} from '../shared/CurrentPageExportButton';
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

const exportColumns: CurrentPageExportColumn<CacheKeySummary>[] = [
  { title: 'Key', dataIndex: 'key', sensitive: true },
  { title: 'Name', dataIndex: 'name' },
  { title: 'Prefix', dataIndex: 'prefix' },
  { title: 'Type', dataIndex: 'type' },
  { title: 'TTL Seconds', dataIndex: 'ttlSeconds' },
  { title: 'Size Bytes', dataIndex: 'sizeBytes' },
];
const searchFields: CurrentPageSearchField<CacheKeySummary>[] = [
  'key',
  'name',
  'prefix',
  'type',
];

function createFilterOptions(
  rows: readonly CacheKeySummary[],
): CurrentPageFilterOption<CacheKeySummary>[] {
  return [
    {
      key: 'name',
      options: createCurrentPageFilterOptions(rows, 'name'),
      placeholder: 'Namespace',
      predicate: (record, value) => record.name === value,
    },
    {
      key: 'type',
      options: createCurrentPageFilterOptions(rows, 'type'),
      placeholder: 'Type',
      predicate: (record, value) => record.type === value,
    },
  ];
}

function formatTtl(ttlSeconds: number): string {
  if (ttlSeconds === -2) {
    return 'missing';
  }

  if (ttlSeconds === -1) {
    return 'persistent';
  }

  return `${ttlSeconds}s`;
}

function createCacheDetailFields(record: CacheValueSummary): DetailField[] {
  return [
    { label: 'Key', value: record.key, sensitive: true },
    { label: 'Namespace', value: record.name },
    { label: 'Prefix', value: record.prefix },
    { label: 'Type', value: record.type },
    { label: 'TTL', value: formatTtl(record.ttlSeconds) },
    { label: 'Size Bytes', value: record.sizeBytes },
    { label: 'Encoding', value: record.encoding },
    { label: 'Sensitive Preview', value: String(record.sensitive) },
    { label: 'Preview Truncated', value: String(record.truncated) },
  ];
}

export default function CachePage() {
  const access = useAccess();
  const canManageCache = Boolean(access.canManageCache);
  const [rows, setRows] = useState<readonly CacheKeySummary[]>([]);
  const [names, setNames] = useState<readonly CacheNameSummary[]>([]);
  const [scanComplete, setScanComplete] = useState(true);
  const [scanLimit, setScanLimit] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [selectedDetail, setSelectedDetail] = useState<CacheValueSummary>();
  const [actionKey, setActionKey] = useState<string>();
  const [clearingPrefix, setClearingPrefix] = useState<string>();
  const filterOptions = useMemo(() => createFilterOptions(rows), [rows]);
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<CacheKeySummary>({
      rows,
      searchFields,
      searchPlaceholder: 'Search Redis cache',
      selectFilters: filterOptions,
    });
  const totalSizeBytes = rows.reduce((total, row) => total + row.sizeBytes, 0);

  const loadCache = async () => {
    setLoading(true);
    try {
      const [keyRows, nameList] = await Promise.all([
        listOpenCoreCacheKeys(),
        listOpenCoreCacheNames(),
      ]);
      setRows(keyRows);
      setNames(nameList.items);
      setScanComplete(nameList.scanComplete);
      setScanLimit(nameList.scanLimit);
      setLoadError(undefined);
    } catch (error: unknown) {
      setRows([]);
      setNames([]);
      setLoadError(
        error instanceof Error ? error.message : 'Unable to load cache.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCache();
  }, []);

  const openDetail = async (record: CacheKeySummary) => {
    setActionKey(`detail:${record.key}`);
    try {
      setSelectedDetail(await getOpenCoreCacheValue(record.key));
    } finally {
      setActionKey(undefined);
    }
  };

  const dryRunClearPrefix = async (prefix: string) => {
    setClearingPrefix(`dry-run:${prefix}`);
    try {
      const result = await clearOpenCoreCache({
        prefix,
        dryRun: true,
      });
      message.info(`Dry run matched ${result.matchedKeys} cache keys`);
    } finally {
      setClearingPrefix(undefined);
    }
  };

  const confirmClearPrefix = (name: CacheNameSummary) => {
    Modal.confirm({
      title: `Clear cache namespace ${name.name}?`,
      content:
        'Confirmed prefix clear deletes every key currently matching this namespace.',
      okButtonProps: { danger: true },
      okText: 'Clear namespace',
      onOk: async () => {
        setClearingPrefix(`clear:${name.prefix}`);
        try {
          const result = await clearOpenCoreCache({
            prefix: name.prefix,
            dryRun: false,
            confirmed: true,
          });
          message.success(`Cleared ${result.clearedKeys} cache keys`);
          await loadCache();
        } finally {
          setClearingPrefix(undefined);
        }
      },
    });
  };

  const confirmDeleteKey = (record: CacheKeySummary) => {
    Modal.confirm({
      title: `Delete cache key?`,
      content: record.key,
      okButtonProps: { danger: true },
      okText: 'Delete key',
      onOk: async () => {
        setActionKey(`delete:${record.key}`);
        try {
          const result = await deleteOpenCoreCacheKey({
            key: record.key,
            dryRun: false,
            confirmed: true,
          });
          message.success(result.deleted ? 'Cache key deleted' : 'Key missing');
          await loadCache();
        } finally {
          setActionKey(undefined);
        }
      },
    });
  };

  const columns: ProColumns<CacheKeySummary>[] = [
    {
      title: 'Key',
      dataIndex: 'key',
      ellipsis: true,
      copyable: true,
    },
    { title: 'Namespace', dataIndex: 'name', width: 180 },
    { title: 'Type', dataIndex: 'type', width: 100 },
    {
      title: 'TTL',
      dataIndex: 'ttlSeconds',
      width: 120,
      render: (_, record) => formatTtl(record.ttlSeconds),
    },
    { title: 'Size', dataIndex: 'sizeBytes', width: 100 },
    {
      title: 'Policy',
      width: 220,
      render: () => (
        <Tag color="orange">
          Redis live monitor; dry-run by default; confirmed clear required
        </Tag>
      ),
    },
    {
      title: 'Actions',
      valueType: 'option',
      width: 140,
      render: (_, record) => [
        <Tooltip title="View safe value preview" key="detail">
          <Button
            icon={<EyeOutlined />}
            loading={actionKey === `detail:${record.key}`}
            size="small"
            onClick={() => void openDetail(record)}
          />
        </Tooltip>,
        <Tooltip title="Delete cache key" key="delete">
          <Button
            danger
            disabled={!canManageCache}
            icon={<DeleteOutlined />}
            loading={actionKey === `delete:${record.key}`}
            size="small"
            onClick={() => confirmDeleteKey(record)}
          />
        </Tooltip>,
      ],
    },
  ];

  return (
    <PageContainer title="Cache" subTitle="Redis Monitor">
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {loadError ? <Alert showIcon type="error" message={loadError} /> : null}
        {!scanComplete ? (
          <Alert
            showIcon
            type="warning"
            message={`Cache scan reached the ${scanLimit} key limit; narrow by namespace before confirmed deletion.`}
          />
        ) : null}

        <Space wrap>
          <Statistic title="Keys" value={rows.length} />
          <Statistic title="Namespaces" value={names.length} />
          <Statistic title="Size Bytes" value={totalSizeBytes} />
          <Statistic
            title="Scan"
            value={scanComplete ? 'complete' : 'limited'}
          />
        </Space>

        <ProTable<CacheNameSummary>
          columns={[
            { title: 'Namespace', dataIndex: 'name' },
            { title: 'Prefix', dataIndex: 'prefix' },
            { title: 'Keys', dataIndex: 'keyCount' },
            { title: 'Expiring', dataIndex: 'expiringKeys' },
            { title: 'Persistent', dataIndex: 'persistentKeys' },
            { title: 'Size', dataIndex: 'totalSizeBytes' },
            {
              title: 'Actions',
              valueType: 'option',
              render: (_, record) => [
                <Tooltip title="Dry-run prefix clear" key="dry-run">
                  <Button
                    icon={<ClearOutlined />}
                    loading={clearingPrefix === `dry-run:${record.prefix}`}
                    size="small"
                    onClick={() => void dryRunClearPrefix(record.prefix)}
                  />
                </Tooltip>,
                <Tooltip title="Clear namespace" key="clear">
                  <Button
                    danger
                    disabled={!canManageCache}
                    icon={<DeleteOutlined />}
                    loading={clearingPrefix === `clear:${record.prefix}`}
                    size="small"
                    onClick={() => confirmClearPrefix(record)}
                  />
                </Tooltip>,
              ],
            },
          ]}
          dataSource={names}
          loading={loading}
          options={false}
          pagination={false}
          rowKey="name"
          search={false}
          size="small"
          toolBarRender={() => [
            <Button
              icon={<ReloadOutlined />}
              key="reload-names"
              onClick={() => void loadCache()}
            >
              Reload Redis cache
            </Button>,
          ]}
        />

        <ProTable<CacheKeySummary>
          columns={columns}
          dataSource={filteredRows}
          loading={loading}
          options={false}
          pagination={{ pageSize: 20 }}
          rowKey="key"
          search={false}
          toolBarRender={() => [
            filterToolbar,
            <CurrentPageExportButton
              columns={exportColumns}
              key="export"
              resource="cache-keys"
              rows={filteredRows}
            />,
          ]}
        />
      </Space>

      <ReadOnlyDetailDrawer
        fields={selectedDetail ? createCacheDetailFields(selectedDetail) : []}
        jsonSections={
          selectedDetail
            ? [
                {
                  title: 'Safe Value Preview',
                  value: {
                    preview: selectedDetail.valuePreview,
                    sensitive: selectedDetail.sensitive,
                    truncated: selectedDetail.truncated,
                  },
                },
              ]
            : []
        }
        onClose={() => setSelectedDetail(undefined)}
        open={Boolean(selectedDetail)}
        title={
          <Space>
            <Typography.Text>Cache Value</Typography.Text>
            {selectedDetail?.sensitive ? <Tag color="red">redacted</Tag> : null}
          </Space>
        }
      />
    </PageContainer>
  );
}
