import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import {
  createOperationsFixtures,
  findExportJobDesignFixture,
  type ExportJobDesignSummary,
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

const rows = [createOperationsFixtures().exportJobDesign];
const searchFields: CurrentPageSearchField<ExportJobDesignSummary>[] = [
  'resource',
  'status',
  'runbook',
  (record) => record.requiredBindings,
  (record) => record.safetyChecks,
];

type FormatMessage = (
  id: string,
  defaultMessage: string,
  values?: Record<string, number | string>,
) => string;

export default function ExportJobsPage() {
  const intl = useIntl();
  const [selected, setSelected] = useState<ExportJobDesignSummary>();
  const formatMessage: FormatMessage = useCallback(
    (id, defaultMessage, values) =>
      values
        ? intl.formatMessage({ id, defaultMessage }, values)
        : intl.formatMessage({ id, defaultMessage }),
    [intl],
  );
  const exportColumns: CurrentPageExportColumn<ExportJobDesignSummary>[] =
    useMemo(
      () => [
        {
          title: formatMessage(
            'pages.optional.exportJobs.fields.resource',
            'Resource',
          ),
          dataIndex: 'resource',
        },
        {
          title: formatMessage(
            'pages.optional.exportJobs.fields.status',
            'Status',
          ),
          dataIndex: 'status',
        },
        {
          title: formatMessage(
            'pages.optional.exportJobs.fields.requiredBindings',
            'Required Bindings',
          ),
          renderText: (record) => record.requiredBindings.join(', '),
        },
        {
          title: formatMessage(
            'pages.optional.exportJobs.fields.safetyChecks',
            'Safety Checks',
          ),
          renderText: (record) => record.safetyChecks.join(', '),
        },
        {
          title: formatMessage(
            'pages.optional.exportJobs.fields.runbook',
            'Runbook',
          ),
          dataIndex: 'runbook',
        },
      ],
      [formatMessage],
    );
  const filterOptions: CurrentPageFilterOption<ExportJobDesignSummary>[] =
    useMemo(
      () => [
        {
          key: 'status',
          options: createCurrentPageFilterOptions(rows, 'status'),
          placeholder: formatMessage(
            'pages.optional.exportJobs.fields.status',
            'Status',
          ),
          predicate: (record, value) => record.status === value,
        },
      ],
      [formatMessage],
    );
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<ExportJobDesignSummary>({
      rows,
      searchFields,
      searchPlaceholder: formatMessage(
        'pages.optional.exportJobs.search.placeholder',
        'Search export design',
      ),
      selectFilters: filterOptions,
    });

  const openDetail = (resource: string) => {
    setSelected(findExportJobDesignFixture(resource));
  };

  const columns: ProColumns<ExportJobDesignSummary>[] = [
    {
      title: formatMessage(
        'pages.optional.exportJobs.fields.resource',
        'Resource',
      ),
      dataIndex: 'resource',
      render: (_, record) => (
        <Typography.Link onClick={() => openDetail(record.resource)}>
          {record.resource}
        </Typography.Link>
      ),
    },
    {
      title: formatMessage('pages.optional.exportJobs.fields.status', 'Status'),
      render: (_, record) => <Tag color="blue">{record.status}</Tag>,
    },
    {
      title: formatMessage(
        'pages.optional.exportJobs.fields.bindings',
        'Bindings',
      ),
      renderText: (_, record) => record.requiredBindings.join(', '),
    },
    {
      title: formatMessage(
        'pages.optional.exportJobs.fields.runbook',
        'Runbook',
      ),
      dataIndex: 'runbook',
    },
    {
      title: formatMessage('pages.optional.common.actions.column', 'Action'),
      valueType: 'option',
      render: (_, record) => (
        <a onClick={() => openDetail(record.resource)}>
          {formatMessage('pages.optional.common.actions.detail', 'Detail')}
        </a>
      ),
    },
  ];

  return (
    <PageContainer
      title={formatMessage('pages.optional.exportJobs.title', 'Export Jobs')}
      subTitle={formatMessage('pages.optional.section', 'Optional Capabilities')}
    >
      <ProTable<ExportJobDesignSummary>
        rowKey="resource"
        search={false}
        options={false}
        toolBarRender={() => [
          filterToolbar,
          <CurrentPageExportButton<ExportJobDesignSummary>
            key="export"
            columns={exportColumns}
            resource="optional-export-jobs"
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
              'pages.optional.exportJobs.fields.resource',
              'Resource',
            ),
            value: selected?.resource,
          },
          {
            label: formatMessage(
              'pages.optional.exportJobs.fields.status',
              'Status',
            ),
            value: selected?.status,
          },
          {
            label: formatMessage(
              'pages.optional.exportJobs.fields.requiredBindings',
              'Required Bindings',
            ),
            value: selected?.requiredBindings.join(', '),
          },
          {
            label: formatMessage(
              'pages.optional.exportJobs.fields.safetyChecks',
              'Safety Checks',
            ),
            value: selected?.safetyChecks.join(', '),
          },
          {
            label: formatMessage(
              'pages.optional.exportJobs.fields.runbook',
              'Runbook',
            ),
            value: selected?.runbook,
          },
        ]}
        onClose={() => setSelected(undefined)}
        open={Boolean(selected)}
        title={
          selected?.resource ??
          formatMessage(
            'pages.optional.exportJobs.detail.title',
            'Export Job Detail',
          )
        }
      />
    </PageContainer>
  );
}
