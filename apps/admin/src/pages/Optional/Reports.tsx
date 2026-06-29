import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import {
  createOperationsFixtures,
  findReportFixture,
  type ReportDefinitionSummary,
} from '@opencore/sdk';
import { useIntl } from '@umijs/max';
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

const rows = createOperationsFixtures().reports;
const searchFields: CurrentPageSearchField<ReportDefinitionSummary>[] = [
  'tenantId',
  'code',
  'name',
  'owner',
  'description',
];

type FormatMessage = (
  id: string,
  defaultMessage: string,
  values?: Record<string, number | string>,
) => string;

export default function ReportsPage() {
  const intl = useIntl();
  const [selected, setSelected] = useState<ReportDefinitionSummary>();
  const formatMessage: FormatMessage = useCallback(
    (id, defaultMessage, values) =>
      values
        ? intl.formatMessage({ id, defaultMessage }, values)
        : intl.formatMessage({ id, defaultMessage }),
    [intl],
  );
  const statusLabels = useMemo(
    () => ({
      disabled: formatMessage(
        'pages.optional.reports.status.disabled',
        'disabled',
      ),
      enabled: formatMessage(
        'pages.optional.reports.status.enabled',
        'enabled',
      ),
    }),
    [formatMessage],
  );
  const exportColumns: CurrentPageExportColumn<ReportDefinitionSummary>[] =
    useMemo(
      () => [
        {
          title: formatMessage('pages.optional.common.fields.id', 'ID'),
          dataIndex: 'id',
        },
        {
          title: formatMessage(
            'pages.optional.reports.fields.tenantId',
            'Tenant ID',
          ),
          dataIndex: 'tenantId',
        },
        {
          title: formatMessage('pages.optional.reports.fields.code', 'Code'),
          dataIndex: 'code',
        },
        {
          title: formatMessage('pages.optional.reports.fields.name', 'Name'),
          dataIndex: 'name',
        },
        {
          title: formatMessage('pages.optional.reports.fields.owner', 'Owner'),
          dataIndex: 'owner',
        },
        {
          title: formatMessage(
            'pages.optional.reports.fields.enabled',
            'Enabled',
          ),
          dataIndex: 'enabled',
        },
        {
          title: formatMessage(
            'pages.optional.reports.fields.description',
            'Description',
          ),
          dataIndex: 'description',
        },
        {
          title: formatMessage(
            'pages.optional.reports.fields.querySchema',
            'Query Schema',
          ),
          dataIndex: 'querySchema',
          sensitive: true,
        },
      ],
      [formatMessage],
    );
  const filterOptions: CurrentPageFilterOption<ReportDefinitionSummary>[] =
    useMemo(
      () => [
        {
          key: 'enabled',
          options: [
            { label: statusLabels.enabled, value: 'true' },
            { label: statusLabels.disabled, value: 'false' },
          ],
          placeholder: formatMessage(
            'pages.optional.reports.fields.enabled',
            'Enabled',
          ),
          predicate: (record, value) => record.enabled === (value === 'true'),
        },
        {
          key: 'owner',
          options: createCurrentPageFilterOptions(rows, 'owner'),
          placeholder: formatMessage(
            'pages.optional.reports.fields.owner',
            'Owner',
          ),
          predicate: (record, value) => record.owner === value,
        },
      ],
      [formatMessage, statusLabels],
    );
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<ReportDefinitionSummary>({
      rows,
      searchFields,
      searchPlaceholder: formatMessage(
        'pages.optional.reports.search.placeholder',
        'Search reports',
      ),
      selectFilters: filterOptions,
    });

  const openDetail = (code: string) => {
    setSelected(findReportFixture(code));
  };

  const columns: ProColumns<ReportDefinitionSummary>[] = [
    {
      title: formatMessage(
        'pages.optional.reports.fields.tenantId',
        'Tenant ID',
      ),
      dataIndex: 'tenantId',
      width: 160,
    },
    {
      title: formatMessage('pages.optional.reports.fields.code', 'Code'),
      dataIndex: 'code',
      render: (_, record) => (
        <Typography.Link onClick={() => openDetail(record.code)}>
          {record.code}
        </Typography.Link>
      ),
    },
    {
      title: formatMessage('pages.optional.reports.fields.name', 'Name'),
      dataIndex: 'name',
    },
    {
      title: formatMessage('pages.optional.reports.fields.owner', 'Owner'),
      dataIndex: 'owner',
    },
    {
      title: formatMessage('pages.optional.reports.fields.enabled', 'Enabled'),
      render: (_, record) => (
        <Tag color={record.enabled ? 'green' : 'default'}>
          {record.enabled ? statusLabels.enabled : statusLabels.disabled}
        </Tag>
      ),
    },
    {
      title: formatMessage('pages.optional.common.actions.column', 'Action'),
      valueType: 'option',
      render: (_, record) => (
        <a onClick={() => openDetail(record.code)}>
          {formatMessage('pages.optional.common.actions.detail', 'Detail')}
        </a>
      ),
    },
  ];

  return (
    <PageContainer
      title={formatMessage('pages.optional.reports.title', 'Reports')}
      subTitle={formatMessage(
        'pages.optional.section',
        'Optional Capabilities',
      )}
    >
      <ProTable<ReportDefinitionSummary>
        rowKey="code"
        search={false}
        options={false}
        toolBarRender={() => [
          filterToolbar,
          <CurrentPageExportButton<ReportDefinitionSummary>
            key="export"
            columns={exportColumns}
            resource="optional-reports"
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
              'pages.optional.reports.fields.tenantId',
              'Tenant ID',
            ),
            value: selected?.tenantId,
          },
          {
            label: formatMessage('pages.optional.reports.fields.code', 'Code'),
            value: selected?.code,
          },
          {
            label: formatMessage('pages.optional.reports.fields.name', 'Name'),
            value: selected?.name,
          },
          {
            label: formatMessage(
              'pages.optional.reports.fields.owner',
              'Owner',
            ),
            value: selected?.owner,
          },
          {
            label: formatMessage(
              'pages.optional.reports.fields.enabled',
              'Enabled',
            ),
            value:
              selected?.enabled === undefined
                ? undefined
                : selected.enabled
                  ? statusLabels.enabled
                  : statusLabels.disabled,
          },
          {
            label: formatMessage(
              'pages.optional.reports.fields.description',
              'Description',
            ),
            value: selected?.description,
          },
        ]}
        jsonSections={[
          {
            title: formatMessage(
              'pages.optional.reports.fields.querySchema',
              'Query Schema',
            ),
            value: selected?.querySchema ?? {},
          },
        ]}
        onClose={() => setSelected(undefined)}
        open={Boolean(selected)}
        title={
          selected?.name ??
          formatMessage('pages.optional.reports.detail.title', 'Report Detail')
        }
      />
    </PageContainer>
  );
}
