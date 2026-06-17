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
import { useAccess, useIntl } from '@umijs/max';
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
import { useCallback, useEffect, useMemo, useState } from 'react';
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

type FormatMessage = (
  id: string,
  defaultMessage: string,
  values?: Record<string, number | string>,
) => string;

const searchFields: CurrentPageSearchField<CacheKeySummary>[] = [
  'key',
  'name',
  'prefix',
  'type',
];

function createExportColumns(
  formatMessage: FormatMessage,
): CurrentPageExportColumn<CacheKeySummary>[] {
  return [
    {
      title: formatMessage('pages.monitor.cache.fields.key', 'Key'),
      dataIndex: 'key',
      sensitive: true,
    },
    {
      title: formatMessage('pages.monitor.cache.fields.name', 'Name'),
      dataIndex: 'name',
    },
    {
      title: formatMessage('pages.monitor.cache.fields.prefix', 'Prefix'),
      dataIndex: 'prefix',
    },
    {
      title: formatMessage('pages.monitor.cache.fields.type', 'Type'),
      dataIndex: 'type',
    },
    {
      title: formatMessage(
        'pages.monitor.cache.fields.ttlSeconds',
        'TTL Seconds',
      ),
      dataIndex: 'ttlSeconds',
    },
    {
      title: formatMessage(
        'pages.monitor.cache.fields.sizeBytes',
        'Size Bytes',
      ),
      dataIndex: 'sizeBytes',
    },
  ];
}

function createFilterOptions(
  rows: readonly CacheKeySummary[],
  formatMessage: FormatMessage,
): CurrentPageFilterOption<CacheKeySummary>[] {
  return [
    {
      key: 'name',
      options: createCurrentPageFilterOptions(rows, 'name'),
      placeholder: formatMessage(
        'pages.monitor.cache.fields.namespace',
        'Namespace',
      ),
      predicate: (record, value) => record.name === value,
    },
    {
      key: 'type',
      options: createCurrentPageFilterOptions(rows, 'type'),
      placeholder: formatMessage('pages.monitor.cache.fields.type', 'Type'),
      predicate: (record, value) => record.type === value,
    },
  ];
}

function formatTtl(ttlSeconds: number, formatMessage: FormatMessage): string {
  if (ttlSeconds === -2) {
    return formatMessage('pages.monitor.cache.ttl.missing', 'missing');
  }

  if (ttlSeconds === -1) {
    return formatMessage('pages.monitor.cache.ttl.persistent', 'persistent');
  }

  return formatMessage('pages.monitor.cache.ttl.seconds', '{seconds}s', {
    seconds: ttlSeconds,
  });
}

function createCacheDetailFields(
  record: CacheValueSummary,
  formatMessage: FormatMessage,
): DetailField[] {
  return [
    {
      label: formatMessage('pages.monitor.cache.fields.key', 'Key'),
      value: record.key,
      sensitive: true,
    },
    {
      label: formatMessage('pages.monitor.cache.fields.namespace', 'Namespace'),
      value: record.name,
    },
    {
      label: formatMessage('pages.monitor.cache.fields.prefix', 'Prefix'),
      value: record.prefix,
    },
    {
      label: formatMessage('pages.monitor.cache.fields.type', 'Type'),
      value: record.type,
    },
    {
      label: formatMessage('pages.monitor.cache.fields.ttl', 'TTL'),
      value: formatTtl(record.ttlSeconds, formatMessage),
    },
    {
      label: formatMessage(
        'pages.monitor.cache.fields.sizeBytes',
        'Size Bytes',
      ),
      value: record.sizeBytes,
    },
    {
      label: formatMessage('pages.monitor.cache.fields.encoding', 'Encoding'),
      value: record.encoding,
    },
    {
      label: formatMessage(
        'pages.monitor.cache.fields.sensitivePreview',
        'Sensitive Preview',
      ),
      value: record.sensitive
        ? formatMessage('pages.monitor.cache.boolean.true', 'true')
        : formatMessage('pages.monitor.cache.boolean.false', 'false'),
    },
    {
      label: formatMessage(
        'pages.monitor.cache.fields.previewTruncated',
        'Preview Truncated',
      ),
      value: record.truncated
        ? formatMessage('pages.monitor.cache.boolean.true', 'true')
        : formatMessage('pages.monitor.cache.boolean.false', 'false'),
    },
  ];
}

export default function CachePage() {
  const access = useAccess();
  const intl = useIntl();
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
  const formatMessage = useCallback(
    (
      id: string,
      defaultMessage: string,
      values?: Record<string, number | string>,
    ) =>
      values
        ? intl.formatMessage({ id, defaultMessage }, values)
        : intl.formatMessage({ id, defaultMessage }),
    [intl],
  );
  const exportColumns = useMemo(
    () => createExportColumns(formatMessage),
    [formatMessage],
  );
  const filterOptions = useMemo(
    () => createFilterOptions(rows, formatMessage),
    [formatMessage, rows],
  );
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<CacheKeySummary>({
      rows,
      searchFields,
      searchPlaceholder: formatMessage(
        'pages.monitor.cache.search.placeholder',
        'Search Redis cache',
      ),
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
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.monitor.cache.load.failure',
              'Unable to load cache.',
            ),
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
      message.info(
        formatMessage(
          'pages.monitor.cache.messages.dryRunMatched',
          'Dry run matched {count} cache keys',
          { count: result.matchedKeys },
        ),
      );
    } finally {
      setClearingPrefix(undefined);
    }
  };

  const confirmClearPrefix = (name: CacheNameSummary) => {
    Modal.confirm({
      title: formatMessage(
        'pages.monitor.cache.confirm.clearNamespace',
        'Clear cache namespace {name}?',
        { name: name.name },
      ),
      content: formatMessage(
        'pages.monitor.cache.confirm.clearNamespaceContent',
        'Confirmed prefix clear deletes every key currently matching this namespace.',
      ),
      okButtonProps: { danger: true },
      okText: formatMessage(
        'pages.monitor.cache.actions.clearNamespace',
        'Clear namespace',
      ),
      onOk: async () => {
        setClearingPrefix(`clear:${name.prefix}`);
        try {
          const result = await clearOpenCoreCache({
            prefix: name.prefix,
            dryRun: false,
            confirmed: true,
          });
          message.success(
            formatMessage(
              'pages.monitor.cache.messages.clearedKeys',
              'Cleared {count} cache keys',
              { count: result.clearedKeys },
            ),
          );
          await loadCache();
        } finally {
          setClearingPrefix(undefined);
        }
      },
    });
  };

  const confirmDeleteKey = (record: CacheKeySummary) => {
    Modal.confirm({
      title: formatMessage(
        'pages.monitor.cache.confirm.deleteKey',
        'Delete cache key?',
      ),
      content: record.key,
      okButtonProps: { danger: true },
      okText: formatMessage(
        'pages.monitor.cache.actions.deleteKey',
        'Delete key',
      ),
      onOk: async () => {
        setActionKey(`delete:${record.key}`);
        try {
          const result = await deleteOpenCoreCacheKey({
            key: record.key,
            dryRun: false,
            confirmed: true,
          });
          message.success(
            result.deleted
              ? formatMessage(
                  'pages.monitor.cache.messages.keyDeleted',
                  'Cache key deleted',
                )
              : formatMessage(
                  'pages.monitor.cache.messages.keyMissing',
                  'Key missing',
                ),
          );
          await loadCache();
        } finally {
          setActionKey(undefined);
        }
      },
    });
  };

  const columns: ProColumns<CacheKeySummary>[] = [
    {
      title: formatMessage('pages.monitor.cache.fields.key', 'Key'),
      dataIndex: 'key',
      ellipsis: true,
      copyable: true,
    },
    {
      title: formatMessage('pages.monitor.cache.fields.namespace', 'Namespace'),
      dataIndex: 'name',
      width: 180,
    },
    {
      title: formatMessage('pages.monitor.cache.fields.type', 'Type'),
      dataIndex: 'type',
      width: 100,
    },
    {
      title: formatMessage('pages.monitor.cache.fields.ttl', 'TTL'),
      dataIndex: 'ttlSeconds',
      width: 120,
      render: (_, record) => formatTtl(record.ttlSeconds, formatMessage),
    },
    {
      title: formatMessage('pages.monitor.cache.fields.size', 'Size'),
      dataIndex: 'sizeBytes',
      width: 100,
    },
    {
      title: formatMessage('pages.monitor.cache.fields.policy', 'Policy'),
      width: 220,
      render: () => (
        <Tag color="orange">
          {formatMessage(
            'pages.monitor.cache.policy.liveMonitor',
            'Redis live monitor; dry-run by default; confirmed clear required',
          )}
        </Tag>
      ),
    },
    {
      title: formatMessage('pages.monitor.cache.actions.column', 'Actions'),
      valueType: 'option',
      width: 140,
      render: (_, record) => [
        <Tooltip
          title={formatMessage(
            'pages.monitor.cache.actions.viewSafePreview',
            'View safe value preview',
          )}
          key="detail"
        >
          <Button
            icon={<EyeOutlined />}
            loading={actionKey === `detail:${record.key}`}
            size="small"
            onClick={() => void openDetail(record)}
          />
        </Tooltip>,
        <Tooltip
          title={formatMessage(
            'pages.monitor.cache.actions.deleteKey',
            'Delete cache key',
          )}
          key="delete"
        >
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
    <PageContainer
      title={formatMessage('pages.monitor.cache.title', 'Cache')}
      subTitle={formatMessage('pages.monitor.cache.subTitle', 'Redis Monitor')}
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {loadError ? <Alert showIcon type="error" message={loadError} /> : null}
        {!scanComplete ? (
          <Alert
            showIcon
            type="warning"
            message={formatMessage(
              'pages.monitor.cache.scan.limited',
              'Cache scan reached the {limit} key limit; narrow by namespace before confirmed deletion.',
              { limit: scanLimit },
            )}
          />
        ) : null}

        <Space wrap>
          <Statistic
            title={formatMessage('pages.monitor.cache.stats.keys', 'Keys')}
            value={rows.length}
          />
          <Statistic
            title={formatMessage(
              'pages.monitor.cache.stats.namespaces',
              'Namespaces',
            )}
            value={names.length}
          />
          <Statistic
            title={formatMessage(
              'pages.monitor.cache.fields.sizeBytes',
              'Size Bytes',
            )}
            value={totalSizeBytes}
          />
          <Statistic
            title={formatMessage('pages.monitor.cache.stats.scan', 'Scan')}
            value={
              scanComplete
                ? formatMessage('pages.monitor.cache.scan.complete', 'complete')
                : formatMessage(
                    'pages.monitor.cache.scan.limitedStatus',
                    'limited',
                  )
            }
          />
        </Space>

        <ProTable<CacheNameSummary>
          columns={[
            {
              title: formatMessage(
                'pages.monitor.cache.fields.namespace',
                'Namespace',
              ),
              dataIndex: 'name',
            },
            {
              title: formatMessage(
                'pages.monitor.cache.fields.prefix',
                'Prefix',
              ),
              dataIndex: 'prefix',
            },
            {
              title: formatMessage('pages.monitor.cache.stats.keys', 'Keys'),
              dataIndex: 'keyCount',
            },
            {
              title: formatMessage(
                'pages.monitor.cache.fields.expiring',
                'Expiring',
              ),
              dataIndex: 'expiringKeys',
            },
            {
              title: formatMessage(
                'pages.monitor.cache.ttl.persistent',
                'Persistent',
              ),
              dataIndex: 'persistentKeys',
            },
            {
              title: formatMessage('pages.monitor.cache.fields.size', 'Size'),
              dataIndex: 'totalSizeBytes',
            },
            {
              title: formatMessage(
                'pages.monitor.cache.actions.column',
                'Actions',
              ),
              valueType: 'option',
              render: (_, record) => [
                <Tooltip
                  title={formatMessage(
                    'pages.monitor.cache.actions.dryRunPrefixClear',
                    'Dry-run prefix clear',
                  )}
                  key="dry-run"
                >
                  <Button
                    icon={<ClearOutlined />}
                    loading={clearingPrefix === `dry-run:${record.prefix}`}
                    size="small"
                    onClick={() => void dryRunClearPrefix(record.prefix)}
                  />
                </Tooltip>,
                <Tooltip
                  title={formatMessage(
                    'pages.monitor.cache.actions.clearNamespace',
                    'Clear namespace',
                  )}
                  key="clear"
                >
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
              {formatMessage(
                'pages.monitor.cache.actions.reloadRedisCache',
                'Reload Redis cache',
              )}
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
        fields={
          selectedDetail
            ? createCacheDetailFields(selectedDetail, formatMessage)
            : []
        }
        jsonSections={
          selectedDetail
            ? [
                {
                  title: formatMessage(
                    'pages.monitor.cache.fields.safeValuePreview',
                    'Safe Value Preview',
                  ),
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
            <Typography.Text>
              {formatMessage('pages.monitor.cache.detail.title', 'Cache Value')}
            </Typography.Text>
            {selectedDetail?.sensitive ? (
              <Tag color="red">
                {formatMessage(
                  'pages.monitor.cache.preview.redacted',
                  'redacted',
                )}
              </Tag>
            ) : null}
          </Space>
        }
      />
    </PageContainer>
  );
}
