import { EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import type { IntegrationDesignSummary } from '@opencore/sdk';
import {
  Alert,
  Button,
  Space,
  Statistic,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getOpenCoreWeChatDesign } from '@/services/opencore/platform';
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
import { ReadOnlyDetailDrawer } from '../shared/ReadOnlyDetailDrawer';

const WECHAT_READ_PERMISSION_MARKER = 'integration:wechat:read';

const searchFields: CurrentPageSearchField<IntegrationDesignSummary>[] = [
  'topic',
  'status',
  'documentPath',
  (record) => record.boundaries,
];

function statusColor(status: IntegrationDesignSummary['status']): string {
  return status === 'design-only' ? 'gold' : 'blue';
}

type FormatMessage = (
  id: string,
  defaultMessage: string,
  values?: Record<string, number | string>,
) => string;

function createExportColumns(
  formatMessage: FormatMessage,
): CurrentPageExportColumn<IntegrationDesignSummary>[] {
  return [
    {
      title: formatMessage('pages.integrations.design.fields.topic', 'Topic'),
      dataIndex: 'topic',
    },
    {
      title: formatMessage('pages.integrations.design.fields.status', 'Status'),
      dataIndex: 'status',
    },
    {
      title: formatMessage(
        'pages.integrations.design.fields.boundaries',
        'Boundaries',
      ),
      renderText: (record) => record.boundaries.join(', '),
    },
    {
      title: formatMessage(
        'pages.integrations.design.fields.document',
        'Document',
      ),
      dataIndex: 'documentPath',
    },
  ];
}

export default function WeChatIntegrationPage() {
  const intl = useIntl();
  const [rows, setRows] = useState<readonly IntegrationDesignSummary[]>([]);
  const [selected, setSelected] = useState<IntegrationDesignSummary>();
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loadError, setLoadError] = useState<string>();
  const formatMessage: FormatMessage = useCallback(
    (id, defaultMessage, values) =>
      values
        ? intl.formatMessage({ id, defaultMessage }, values)
        : intl.formatMessage({ id, defaultMessage }),
    [intl],
  );
  const statusLabels = useMemo<
    Record<IntegrationDesignSummary['status'], string>
  >(
    () => ({
      'design-only': formatMessage(
        'pages.integrations.design.status.designOnly',
        'design-only',
      ),
      'runtime-active': formatMessage(
        'pages.integrations.design.status.runtimeActive',
        'runtime-active',
      ),
    }),
    [formatMessage],
  );
  const exportColumns = useMemo(
    () => createExportColumns(formatMessage),
    [formatMessage],
  );

  const filterOptions: CurrentPageFilterOption<IntegrationDesignSummary>[] =
    useMemo(
      () => [
        {
          key: 'status',
          options: createCurrentPageFilterOptions(rows, 'status'),
          placeholder: formatMessage(
            'pages.integrations.design.fields.status',
            'Status',
          ),
          predicate: (record, value) => record.status === value,
        },
      ],
      [formatMessage, rows],
    );
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<IntegrationDesignSummary>({
      rows,
      searchFields,
      searchPlaceholder: formatMessage(
        'pages.integrations.wechat.search.placeholder',
        'Search live WeChat design',
      ),
      selectFilters: filterOptions,
    });

  const loadDesign = useCallback(async () => {
    setLoading(true);
    try {
      const design = await getOpenCoreWeChatDesign();
      setRows([design]);
      setLoadError(undefined);
    } catch (error: unknown) {
      setLoadError(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.integrations.wechat.load.failure',
              'Unable to load live WeChat integration design.',
            ),
      );
    } finally {
      setLoading(false);
    }
  }, [formatMessage]);

  useEffect(() => {
    void loadDesign();
  }, [loadDesign]);

  const openDetail = async () => {
    setDetailLoading(true);
    try {
      const design = await getOpenCoreWeChatDesign();
      setSelected(design);
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.integrations.wechat.detail.loadFailure',
              'Unable to load WeChat design detail.',
            ),
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const columns: ProColumns<IntegrationDesignSummary>[] = [
    {
      title: formatMessage('pages.integrations.design.fields.topic', 'Topic'),
      dataIndex: 'topic',
      render: (_, record) => (
        <Typography.Link onClick={() => void openDetail()}>
          {record.topic}
        </Typography.Link>
      ),
    },
    {
      title: formatMessage('pages.integrations.design.fields.status', 'Status'),
      render: (_, record) => (
        <Tag color={statusColor(record.status)}>
          {statusLabels[record.status]}
        </Tag>
      ),
    },
    {
      title: formatMessage(
        'pages.integrations.design.fields.boundaries',
        'Boundaries',
      ),
      renderText: (_, record) => record.boundaries.join(', '),
    },
    {
      title: formatMessage(
        'pages.integrations.design.fields.document',
        'Document',
      ),
      dataIndex: 'documentPath',
    },
    {
      title: formatMessage(
        'pages.integrations.design.actions.column',
        'Action',
      ),
      valueType: 'option',
      render: () => (
        <Button
          icon={<EyeOutlined />}
          loading={detailLoading}
          onClick={() => void openDetail()}
          size="small"
          title={WECHAT_READ_PERMISSION_MARKER}
          type="link"
        >
          {formatMessage('pages.integrations.design.actions.detail', 'Detail')}
        </Button>
      ),
    },
  ];

  return (
    <PageContainer
      title={formatMessage(
        'pages.integrations.wechat.title',
        'Live WeChat design',
      )}
      subTitle={formatMessage('pages.integrations.section', 'Integrations')}
      extra={[
        <Tooltip
          key="reload"
          title={formatMessage(
            'pages.integrations.wechat.actions.reload',
            'Reload live WeChat design',
          )}
        >
          <Button
            aria-label={formatMessage(
              'pages.integrations.wechat.actions.reloadAria',
              'Reload live WeChat design',
            )}
            icon={<ReloadOutlined />}
            loading={loading}
            onClick={() => void loadDesign()}
          />
        </Tooltip>,
      ]}
    >
      {loadError ? (
        <Alert
          showIcon
          type="warning"
          message={formatMessage(
            'pages.integrations.wechat.load.liveFailure',
            'Unable to load live WeChat integration design',
          )}
          description={loadError}
          style={{ marginBlockEnd: 16 }}
        />
      ) : null}
      <Space size="large" style={{ marginBottom: 16 }} wrap>
        <Statistic
          title={formatMessage(
            'pages.integrations.design.stats.topics',
            'Design topics',
          )}
          value={rows.length}
        />
        <Statistic
          title={formatMessage(
            'pages.integrations.design.stats.boundaryCount',
            'Boundary count',
          )}
          value={rows[0]?.boundaries.length ?? 0}
        />
        <Tag color="blue">{WECHAT_READ_PERMISSION_MARKER}</Tag>
        <Tag color="gold">
          {formatMessage(
            'pages.integrations.design.policy.boundary',
            'Integration design boundary',
          )}
        </Tag>
      </Space>
      <ProTable<IntegrationDesignSummary>
        rowKey="topic"
        search={false}
        options={false}
        loading={loading}
        toolBarRender={() => [
          filterToolbar,
          <CurrentPageExportButton<IntegrationDesignSummary>
            key="export"
            columns={exportColumns}
            resource="integration-wechat-design"
            rows={filteredRows}
          />,
        ]}
        pagination={false}
        dataSource={filteredRows}
        columns={columns}
      />
      <ReadOnlyDetailDrawer
        fields={[
          {
            label: formatMessage(
              'pages.integrations.design.fields.topic',
              'Topic',
            ),
            value: selected?.topic,
          },
          {
            label: formatMessage(
              'pages.integrations.design.fields.status',
              'Status',
            ),
            value: selected ? statusLabels[selected.status] : undefined,
          },
          {
            label: formatMessage(
              'pages.integrations.design.fields.boundaries',
              'Boundaries',
            ),
            value: selected?.boundaries.join(', '),
          },
          {
            label: formatMessage(
              'pages.integrations.design.fields.document',
              'Document',
            ),
            value: selected?.documentPath,
          },
        ]}
        onClose={() => setSelected(undefined)}
        open={Boolean(selected)}
        title={formatMessage(
          'pages.integrations.wechat.detail.title',
          'WeChat Design Detail',
        )}
      />
    </PageContainer>
  );
}
