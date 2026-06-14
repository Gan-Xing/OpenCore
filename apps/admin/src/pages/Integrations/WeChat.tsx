import { EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
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

const exportColumns: CurrentPageExportColumn<IntegrationDesignSummary>[] = [
  { title: 'Topic', dataIndex: 'topic' },
  { title: 'Status', dataIndex: 'status' },
  { title: 'Boundaries', renderText: (record) => record.boundaries.join(', ') },
  { title: 'Document', dataIndex: 'documentPath' },
];

const searchFields: CurrentPageSearchField<IntegrationDesignSummary>[] = [
  'topic',
  'status',
  'documentPath',
  (record) => record.boundaries,
];

function statusColor(status: IntegrationDesignSummary['status']): string {
  return status === 'design-only' ? 'gold' : 'blue';
}

export default function WeChatIntegrationPage() {
  const [rows, setRows] = useState<readonly IntegrationDesignSummary[]>([]);
  const [selected, setSelected] = useState<IntegrationDesignSummary>();
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loadError, setLoadError] = useState<string>();

  const filterOptions: CurrentPageFilterOption<IntegrationDesignSummary>[] =
    useMemo(
      () => [
        {
          key: 'status',
          options: createCurrentPageFilterOptions(rows, 'status'),
          placeholder: 'Status',
          predicate: (record, value) => record.status === value,
        },
      ],
      [rows],
    );
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<IntegrationDesignSummary>({
      rows,
      searchFields,
      searchPlaceholder: 'Search live WeChat design',
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
          : 'Unable to load live WeChat integration design.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

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
          : 'Unable to load WeChat design detail.',
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const columns: ProColumns<IntegrationDesignSummary>[] = [
    {
      title: 'Topic',
      dataIndex: 'topic',
      render: (_, record) => (
        <Typography.Link onClick={() => void openDetail()}>
          {record.topic}
        </Typography.Link>
      ),
    },
    {
      title: 'Status',
      render: (_, record) => (
        <Tag color={statusColor(record.status)}>{record.status}</Tag>
      ),
    },
    {
      title: 'Boundaries',
      renderText: (_, record) => record.boundaries.join(', '),
    },
    { title: 'Document', dataIndex: 'documentPath' },
    {
      title: 'Action',
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
          Detail
        </Button>
      ),
    },
  ];

  return (
    <PageContainer
      title="Live WeChat design"
      subTitle="S12 Integrations"
      extra={[
        <Tooltip key="reload" title="Reload live WeChat design">
          <Button
            aria-label="Reload live WeChat design"
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
          message="Unable to load live WeChat integration design"
          description={loadError}
          style={{ marginBlockEnd: 16 }}
        />
      ) : null}
      <Space size="large" style={{ marginBottom: 16 }} wrap>
        <Statistic title="Design topics" value={rows.length} />
        <Statistic
          title="Boundary count"
          value={rows[0]?.boundaries.length ?? 0}
        />
        <Tag color="blue">{WECHAT_READ_PERMISSION_MARKER}</Tag>
        <Tag color="gold">Integration design boundary</Tag>
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
          { label: 'Topic', value: selected?.topic },
          { label: 'Status', value: selected?.status },
          { label: 'Boundaries', value: selected?.boundaries.join(', ') },
          { label: 'Document', value: selected?.documentPath },
        ]}
        onClose={() => setSelected(undefined)}
        open={Boolean(selected)}
        title="WeChat Design Detail"
      />
    </PageContainer>
  );
}
