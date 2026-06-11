import { createFileAssetFixtures, type FileAssetSummary } from '@opencore/sdk';
import { Tag, Typography } from 'antd';
import type { CurrentPageExportColumn } from '../shared/CurrentPageExportButton';
import {
  createCurrentPageFilterOptions,
  type CurrentPageFilterOption,
  type CurrentPageSearchField,
} from '../shared/CurrentPageFilters';
import type { DetailField } from '../shared/ReadOnlyDetailDrawer';
import SystemManagementTable from './SystemManagementTable';

const rows = createFileAssetFixtures().items;
const searchFields: CurrentPageSearchField<FileAssetSummary>[] = [
  'originalName',
  'mimeType',
  'storageKey',
  'uploadedBy',
  'checksum',
];
const filterOptions: CurrentPageFilterOption<FileAssetSummary>[] = [
  {
    key: 'mimeType',
    options: createCurrentPageFilterOptions(rows, 'mimeType'),
    placeholder: 'MIME',
    predicate: (record, value) => record.mimeType === value,
  },
  {
    key: 'uploadedBy',
    options: createCurrentPageFilterOptions(rows, 'uploadedBy'),
    placeholder: 'Uploaded by',
    predicate: (record, value) => record.uploadedBy === value,
  },
];
const exportColumns: CurrentPageExportColumn<FileAssetSummary>[] = [
  { title: 'ID', dataIndex: 'id' },
  { title: 'Name', dataIndex: 'originalName' },
  { title: 'MIME', dataIndex: 'mimeType' },
  { title: 'Size Bytes', dataIndex: 'sizeBytes' },
  { title: 'Storage Key', dataIndex: 'storageKey' },
  { title: 'Uploaded By', dataIndex: 'uploadedBy' },
  { title: 'Created At', dataIndex: 'createdAt' },
];
const detailFields = (record: FileAssetSummary): DetailField[] => [
  { label: 'ID', value: record.id },
  { label: 'Name', value: record.originalName },
  { label: 'MIME', value: record.mimeType },
  { label: 'Size Bytes', value: record.sizeBytes },
  { label: 'Storage Key', value: record.storageKey },
  { label: 'Checksum', value: record.checksum },
  { label: 'Uploaded By', value: record.uploadedBy },
  { label: 'Created At', value: record.createdAt },
];

export default function FilesPage() {
  return (
    <SystemManagementTable<FileAssetSummary>
      title="File Center"
      rows={rows}
      detailFields={detailFields}
      detailTitle={(record) => record.originalName}
      readOnlyReason="File fixtures are read-only until upload/storage writes are admitted."
      resource="core-files"
      searchFields={searchFields}
      filterOptions={filterOptions}
      exportColumns={exportColumns}
      columns={[
        { title: 'Name', dataIndex: 'originalName' },
        {
          title: 'MIME',
          dataIndex: 'mimeType',
          render: (_, record) => <Tag>{record.mimeType}</Tag>,
        },
        {
          title: 'Size',
          dataIndex: 'sizeBytes',
          render: (_, record) => (
            <Typography.Text>{record.sizeBytes} bytes</Typography.Text>
          ),
        },
        { title: 'Storage key', dataIndex: 'storageKey' },
        { title: 'Uploaded by', dataIndex: 'uploadedBy' },
      ]}
    />
  );
}
