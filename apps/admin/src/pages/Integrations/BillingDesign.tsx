import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import {
  createIntegrationFixtures,
  findIntegrationDesignFixture,
  type IntegrationDesignSummary,
} from '@opencore/sdk';
import { Tag, Typography } from 'antd';
import { useCallback, useMemo, useState } from 'react';
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

const rows = createIntegrationFixtures().designs.filter(
  (design) => design.topic === 'pay',
);
const searchFields: CurrentPageSearchField<IntegrationDesignSummary>[] = [
  'topic',
  'status',
  'documentPath',
  (record) => record.boundaries,
];

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

export default function BillingDesignPage() {
  const intl = useIntl();
  const [selected, setSelected] = useState<IntegrationDesignSummary>();
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
      [formatMessage],
    );
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<IntegrationDesignSummary>({
      rows,
      searchFields,
      searchPlaceholder: formatMessage(
        'pages.integrations.billing.search.placeholder',
        'Search payment design',
      ),
      selectFilters: filterOptions,
    });

  const openDetail = (topic: IntegrationDesignSummary['topic']) => {
    setSelected(findIntegrationDesignFixture(topic));
  };

  const columns: ProColumns<IntegrationDesignSummary>[] = [
    {
      title: formatMessage('pages.integrations.design.fields.topic', 'Topic'),
      dataIndex: 'topic',
      render: (_, record) => (
        <Typography.Link onClick={() => openDetail(record.topic)}>
          {record.topic}
        </Typography.Link>
      ),
    },
    {
      title: formatMessage('pages.integrations.design.fields.status', 'Status'),
      render: (_, record) => (
        <Tag color="blue">{statusLabels[record.status]}</Tag>
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
      render: (_, record) => (
        <Typography.Link onClick={() => openDetail(record.topic)}>
          {formatMessage('pages.integrations.design.actions.detail', 'Detail')}
        </Typography.Link>
      ),
    },
  ];

  return (
    <PageContainer
      title={formatMessage('menu.integrations.payment', 'Payment Design')}
      subTitle={formatMessage('pages.integrations.section', 'Integrations')}
    >
      <ProTable<IntegrationDesignSummary>
        rowKey="topic"
        search={false}
        options={false}
        toolBarRender={() => [
          filterToolbar,
          <CurrentPageExportButton<IntegrationDesignSummary>
            key="export"
            columns={exportColumns}
            resource="integration-payment-design"
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
          'pages.integrations.billing.detail.title',
          'Payment Design Detail',
        )}
      />
    </PageContainer>
  );
}
