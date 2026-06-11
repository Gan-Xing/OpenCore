import { EyeOutlined } from '@ant-design/icons';
import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import { Button, Tooltip, Typography } from 'antd';
import type { ReactNode } from 'react';
import { useState } from 'react';
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
  const [selectedDetail, setSelectedDetail] = useState<T>();
  const { filteredRows, toolbar: filterToolbar } = useCurrentPageFilters<T>({
    rows,
    searchFields,
    searchPlaceholder: `Search ${title.toLowerCase()}`,
    selectFilters: filterOptions,
  });

  return (
    <PageContainer title={title} subTitle="S7 System">
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
            title: 'Action',
            valueType: 'option',
            width: 72,
            render: (_, record) => {
              const recordKey = String(record.id ?? record.code ?? record.key);

              return (
                <Tooltip title={`View ${recordKey}`}>
                  <Button
                    aria-label={`View ${recordKey}`}
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
            ? (detailTitle?.(selectedDetail) ?? `${title} Detail`)
            : `${title} Detail`
        }
      />
    </PageContainer>
  );
};

export default SystemManagementTable;
