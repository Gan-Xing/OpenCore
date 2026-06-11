import { createLoginLogFixtures, type LoginLogSummary } from '@opencore/sdk';
import { Tag } from 'antd';
import type { CurrentPageExportColumn } from '../shared/CurrentPageExportButton';
import {
  createCurrentPageFilterOptions,
  type CurrentPageFilterOption,
  type CurrentPageSearchField,
} from '../shared/CurrentPageFilters';
import type { DetailField } from '../shared/ReadOnlyDetailDrawer';
import SystemManagementTable from '../System/SystemManagementTable';

const rows = createLoginLogFixtures().items;
const searchFields: CurrentPageSearchField<LoginLogSummary>[] = [
  'username',
  'ip',
  'requestId',
  'failureReason',
];
const filterOptions: CurrentPageFilterOption<LoginLogSummary>[] = [
  {
    key: 'success',
    options: [
      { label: 'success', value: 'true' },
      { label: 'failure', value: 'false' },
    ],
    placeholder: 'Result',
    predicate: (record, value) => record.success === (value === 'true'),
  },
  {
    key: 'username',
    options: createCurrentPageFilterOptions(rows, 'username'),
    placeholder: 'Username',
    predicate: (record, value) => record.username === value,
  },
];
const exportColumns: CurrentPageExportColumn<LoginLogSummary>[] = [
  { title: 'ID', dataIndex: 'id' },
  { title: 'Time', dataIndex: 'createdAt' },
  { title: 'Username', dataIndex: 'username' },
  { title: 'Success', dataIndex: 'success' },
  { title: 'Failure Reason', dataIndex: 'failureReason' },
  { title: 'IP', dataIndex: 'ip' },
  { title: 'Request ID', dataIndex: 'requestId' },
];
const detailFields = (record: LoginLogSummary): DetailField[] => [
  { label: 'ID', value: record.id },
  { label: 'Time', value: record.createdAt },
  { label: 'Username', value: record.username },
  { label: 'Result', value: record.success ? 'success' : 'failure' },
  { label: 'Failure Reason', value: record.failureReason },
  { label: 'IP', value: record.ip },
  { label: 'User Agent', value: record.userAgent },
  { label: 'Request ID', value: record.requestId },
];

export default function LoginLogsPage() {
  return (
    <SystemManagementTable<LoginLogSummary>
      title="Login Logs"
      rows={rows}
      detailFields={detailFields}
      detailTitle={(record) => record.id}
      readOnlyReason="Login logs are diagnostic records and cannot be mutated from Admin."
      resource="core-login-logs"
      searchFields={searchFields}
      filterOptions={filterOptions}
      exportColumns={exportColumns}
      columns={[
        { title: 'Time', dataIndex: 'createdAt' },
        { title: 'Username', dataIndex: 'username' },
        {
          title: 'Result',
          dataIndex: 'success',
          render: (_, record) => (
            <Tag color={record.success ? 'green' : 'red'}>
              {record.success ? 'success' : 'failure'}
            </Tag>
          ),
        },
        { title: 'IP', dataIndex: 'ip' },
        { title: 'Request ID', dataIndex: 'requestId' },
      ]}
    />
  );
}
