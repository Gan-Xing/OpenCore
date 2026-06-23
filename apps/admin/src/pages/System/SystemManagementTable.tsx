import { EyeOutlined } from '@ant-design/icons';
import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { Button, Tooltip, Typography } from 'antd';
import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';
import {
  CurrentPageExportButton,
  type CurrentPageExportColumn,
} from '../shared/CurrentPageExportButton';
import {
  useCurrentPageFilters,
  type CurrentPageFilterOption,
  type CurrentPageSearchField,
} from '../shared/CurrentPageFilters';
import {
  ReadOnlyDetailDrawer,
  type DetailField,
  type DetailJsonSection,
  type DetailTimelineEntry,
} from '../shared/ReadOnlyDetailDrawer';

type SystemManagementRecord = {
  id?: string;
  code?: string;
  key?: string;
};

type SystemManagementTableProps<T extends SystemManagementRecord> = {
  title: string;
  rows: readonly T[];
  columns: ProColumns<T>[];
  detailFields: (record: T) => readonly DetailField[];
  detailJsonSections?: (record: T) => readonly DetailJsonSection[];
  detailTimeline?: (record: T) => readonly DetailTimelineEntry[];
  detailTitle?: (record: T) => ReactNode;
  exportColumns: readonly CurrentPageExportColumn<T>[];
  filterOptions?: readonly CurrentPageFilterOption<T>[];
  readOnlyReason: string;
  resource: string;
  searchFields: readonly CurrentPageSearchField<T>[];
};

type FormatMessage = (
  id: string,
  defaultMessage: string,
  values?: Record<string, number | string>,
) => string;

const SystemManagementTable = <T extends SystemManagementRecord>({
  title,
  rows,
  columns,
  detailFields,
  detailJsonSections,
  detailTimeline,
  detailTitle,
  exportColumns,
  filterOptions = [],
  readOnlyReason,
  resource,
  searchFields,
}: SystemManagementTableProps<T>) => {
  const intl = useIntl();
  const [selectedDetail, setSelectedDetail] = useState<T>();
  const formatMessage: FormatMessage = useCallback(
    (id, defaultMessage, values) =>
      values
        ? intl.formatMessage({ id, defaultMessage }, values)
        : intl.formatMessage({ id, defaultMessage }),
    [intl],
  );
  const titleText = typeof title === 'string' ? title : '';
  const { filteredRows, toolbar: filterToolbar } = useCurrentPageFilters<T>({
    rows,
    searchFields,
    searchPlaceholder: formatMessage(
      'pages.system.managementTable.search.placeholder',
      'Search {title}',
      { title: titleText.toLowerCase() },
    ),
    selectFilters: filterOptions,
  });

  return (
    <PageContainer
      title={title}
      subTitle={formatMessage('pages.system.section', 'System Management')}
    >
      <ProTable<T>
        rowKey={(record) => String(record.id ?? record.code ?? record.key)}
        search={false}
        options={false}
        toolBarRender={() => [
          filterToolbar,
          <Typography.Text key="read-only-policy" type="secondary">
            {readOnlyReason}
          </Typography.Text>,
          <CurrentPageExportButton<T>
            key="export"
            columns={exportColumns}
            resource={resource}
            rows={filteredRows}
          />,
        ]}
        pagination={{
          pageSize: 10,
        }}
        dataSource={filteredRows}
        columns={[
          ...columns,
          {
            title: formatMessage(
              'pages.system.managementTable.actions.column',
              'Action',
            ),
            valueType: 'option',
            width: 72,
            render: (_, record) => {
              const recordKey = String(record.id ?? record.code ?? record.key);

              return (
                <Tooltip
                  title={formatMessage(
                    'pages.system.managementTable.actions.viewRecord',
                    'View {key}',
                    { key: recordKey },
                  )}
                >
                  <Button
                    aria-label={formatMessage(
                      'pages.system.managementTable.actions.viewRecord',
                      'View {key}',
                      { key: recordKey },
                    )}
                    icon={<EyeOutlined />}
                    onClick={() => setSelectedDetail(record)}
                    size="small"
                  />
                </Tooltip>
              );
            },
          },
        ]}
      />
      <ReadOnlyDetailDrawer
        fields={selectedDetail ? detailFields(selectedDetail) : []}
        jsonSections={
          selectedDetail && detailJsonSections
            ? detailJsonSections(selectedDetail)
            : []
        }
        onClose={() => setSelectedDetail(undefined)}
        open={Boolean(selectedDetail)}
        timeline={
          selectedDetail && detailTimeline ? detailTimeline(selectedDetail) : []
        }
        title={
          selectedDetail
            ? (detailTitle?.(selectedDetail) ??
              formatMessage(
                'pages.system.managementTable.detail.title',
                '{title} Detail',
                { title: titleText },
              ))
            : formatMessage(
                'pages.system.managementTable.detail.title',
                '{title} Detail',
                { title: titleText },
              )
        }
      />
    </PageContainer>
  );
};

export default SystemManagementTable;
