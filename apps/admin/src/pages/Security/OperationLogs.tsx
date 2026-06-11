import { createAuditLogFixtures, type AuditLogSummary } from '@opencore/sdk';
import { Tag } from 'antd';
import type { CurrentPageExportColumn } from '../shared/CurrentPageExportButton';
import {
  createCurrentPageFilterOptions,
  type CurrentPageFilterOption,
  type CurrentPageSearchField,
} from '../shared/CurrentPageFilters';
import type {
  DetailField,
  DetailJsonSection,
} from '../shared/ReadOnlyDetailDrawer';
import SystemManagementTable from '../System/SystemManagementTable';

const rows = createAuditLogFixtures().items;
const searchFields: CurrentPageSearchField<AuditLogSummary>[] = [
  'actorUsername',
  'action',
  'resource',
  'resourceId',
  'method',
  'path',
  'requestId',
];
const filterOptions: CurrentPageFilterOption<AuditLogSummary>[] = [
  {
    key: 'method',
    options: createCurrentPageFilterOptions(rows, 'method'),
    placeholder: 'Method',
    predicate: (record, value) => record.method === value,
  },
  {
    key: 'action',
    options: createCurrentPageFilterOptions(rows, 'action'),
    placeholder: 'Action',
    predicate: (record, value) => record.action === value,
  },
  {
    key: 'status',
    options: [
      { label: 'success', value: 'success' },
      { label: 'error', value: 'error' },
    ],
    placeholder: 'Status',
    predicate: (record, value) =>
      value === 'success' ? record.statusCode < 400 : record.statusCode >= 400,
  },
];
const exportColumns: CurrentPageExportColumn<AuditLogSummary>[] = [
  { title: 'ID', dataIndex: 'id' },
  { title: 'Time', dataIndex: 'createdAt' },
  { title: 'Actor', dataIndex: 'actorUsername' },
  { title: 'Action', dataIndex: 'action' },
  { title: 'Resource', dataIndex: 'resource' },
  { title: 'Resource ID', dataIndex: 'resourceId' },
  { title: 'Method', dataIndex: 'method' },
  { title: 'Path', dataIndex: 'path' },
  { title: 'Status Code', dataIndex: 'statusCode' },
  { title: 'Request ID', dataIndex: 'requestId' },
];
const detailFields = (record: AuditLogSummary): DetailField[] => [
  { label: 'ID', value: record.id },
  { label: 'Time', value: record.createdAt },
  { label: 'Actor', value: record.actorUsername },
  { label: 'Action', value: record.action },
  { label: 'Resource', value: record.resource },
  { label: 'Resource ID', value: record.resourceId },
  { label: 'Method', value: record.method },
  { label: 'Path', value: record.path },
  { label: 'Status Code', value: record.statusCode },
  { label: 'IP', value: record.ip },
  { label: 'User Agent', value: record.userAgent },
  { label: 'Request ID', value: record.requestId },
];
const detailJsonSections = (record: AuditLogSummary): DetailJsonSection[] => [
  { title: 'Metadata', value: record.metadata ?? {} },
];

export default function OperationLogsPage() {
  return (
    <SystemManagementTable<AuditLogSummary>
      title="Operation Logs"
      rows={rows}
      detailFields={detailFields}
      detailJsonSections={detailJsonSections}
      detailTitle={(record) => record.id}
      readOnlyReason="Operation logs are diagnostic records and cannot be mutated from Admin."
      resource="core-audit-logs"
      searchFields={searchFields}
      filterOptions={filterOptions}
      exportColumns={exportColumns}
      columns={[
        { title: 'Time', dataIndex: 'createdAt' },
        { title: 'Actor', dataIndex: 'actorUsername' },
        { title: 'Action', dataIndex: 'action' },
        { title: 'Resource', dataIndex: 'resource' },
        {
          title: 'Status',
          dataIndex: 'statusCode',
          render: (_, record) => (
            <Tag color={record.statusCode < 400 ? 'green' : 'red'}>
              {record.statusCode}
            </Tag>
          ),
        },
        { title: 'Request ID', dataIndex: 'requestId' },
      ]}
    />
  );
}
