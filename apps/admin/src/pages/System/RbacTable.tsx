import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import { Button, Space, Tooltip, Typography } from 'antd';
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

type RbacRecord = {
  id?: string;
  code?: string;
  key?: string;
};

type RbacTableProps<T extends RbacRecord> = {
  title: string;
  rows: readonly T[];
  columns: ProColumns<T>[];
  detailFields: (record: T) => readonly DetailField[];
  detailJsonSections?: (record: T) => readonly DetailJsonSection[];
  detailTimeline?: (record: T) => readonly DetailTimelineEntry[];
  detailTitle?: (record: T) => ReactNode;
  exportColumns: readonly CurrentPageExportColumn<T>[];
  filterOptions?: readonly CurrentPageFilterOption<T>[];
  loading?: boolean;
  readOnlyReason: string;
  resource: string;
  searchFields: readonly CurrentPageSearchField<T>[];
};

const RbacTable = <T extends RbacRecord>({
  title,
  rows,
  columns,
  detailFields,
  detailJsonSections,
  detailTimeline,
  detailTitle,
  exportColumns,
  filterOptions = [],
  loading = false,
  readOnlyReason,
  resource,
  searchFields,
}: RbacTableProps<T>) => {
  const [selectedDetail, setSelectedDetail] = useState<T>();
  const { filteredRows, toolbar: filterToolbar } = useCurrentPageFilters<T>({
    rows,
    searchFields,
    searchPlaceholder: `Search ${title.toLowerCase()}`,
    selectFilters: filterOptions,
  });

  return (
    <PageContainer title={title} subTitle="S6 RBAC">
      <ProTable<T>
        rowKey={(record) => String(record.id ?? record.code ?? record.key)}
        loading={loading}
        search={false}
        options={false}
        toolBarRender={() => [
          filterToolbar,
          <Typography.Text key="read-only-policy" type="secondary">
            {readOnlyReason}
          </Typography.Text>,
          <Tooltip key="create" title={readOnlyReason}>
            <Button disabled type="primary" icon={<PlusOutlined />}>
              New
            </Button>
          </Tooltip>,
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
            title: 'Actions',
            valueType: 'option',
            width: 136,
            render: (_, record) => {
              const recordKey = String(record.id ?? record.code ?? record.key);

              return (
                <Space size="small">
                  <Tooltip title={`View ${recordKey}`}>
                    <Button
                      aria-label={`View ${recordKey}`}
                      icon={<EyeOutlined />}
                      onClick={() => setSelectedDetail(record)}
                      size="small"
                    />
                  </Tooltip>
                  <Tooltip title={readOnlyReason}>
                    <Button
                      aria-label={`Edit ${recordKey}`}
                      disabled
                      icon={<EditOutlined />}
                      size="small"
                    />
                  </Tooltip>
                  <Tooltip title={readOnlyReason}>
                    <Button
                      aria-label={`Delete ${recordKey}`}
                      danger
                      disabled
                      icon={<DeleteOutlined />}
                      size="small"
                    />
                  </Tooltip>
                </Space>
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

export default RbacTable;
