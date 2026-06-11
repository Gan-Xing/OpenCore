import {
  createPermissionSummariesFromRegistry,
  type PermissionSummary,
} from '@opencore/sdk';
import { Tag } from 'antd';
import type { CurrentPageExportColumn } from '../shared/CurrentPageExportButton';
import {
  createCurrentPageFilterOptions,
  type CurrentPageFilterOption,
  type CurrentPageSearchField,
} from '../shared/CurrentPageFilters';
import type { DetailField } from '../shared/ReadOnlyDetailDrawer';
import RbacTable from './RbacTable';

const rows = createPermissionSummariesFromRegistry();
const searchFields: CurrentPageSearchField<PermissionSummary>[] = [
  'code',
  'title',
  'stage',
];
const filterOptions: CurrentPageFilterOption<PermissionSummary>[] = [
  {
    key: 'stage',
    options: createCurrentPageFilterOptions(rows, 'stage'),
    placeholder: 'Stage',
    predicate: (record, value) => record.stage === value,
  },
  {
    key: 'dangerous',
    options: [
      { label: 'dangerous', value: 'true' },
      { label: 'normal', value: 'false' },
    ],
    placeholder: 'Risk',
    predicate: (record, value) => record.dangerous === (value === 'true'),
  },
];
const exportColumns: CurrentPageExportColumn<PermissionSummary>[] = [
  { title: 'Code', dataIndex: 'code' },
  { title: 'Title', dataIndex: 'title' },
  { title: 'Stage', dataIndex: 'stage' },
  { title: 'Dangerous', dataIndex: 'dangerous' },
];
const detailFields = (record: PermissionSummary): DetailField[] => [
  { label: 'Code', value: record.code },
  { label: 'Title', value: record.title },
  { label: 'Stage', value: record.stage },
  { label: 'Risk', value: record.dangerous ? 'dangerous' : 'normal' },
];

export default function PermissionsPage() {
  return (
    <RbacTable<PermissionSummary>
      title="Permissions"
      rows={rows}
      detailFields={detailFields}
      detailTitle={(record) => record.code}
      readOnlyReason="Permissions are registry-managed and read-only in Admin."
      resource="core-permissions"
      searchFields={searchFields}
      filterOptions={filterOptions}
      exportColumns={exportColumns}
      columns={[
        { title: 'Code', dataIndex: 'code' },
        { title: 'Title', dataIndex: 'title' },
        {
          title: 'Stage',
          dataIndex: 'stage',
          render: (_, record) => <Tag>{record.stage}</Tag>,
        },
        {
          title: 'Risk',
          dataIndex: 'dangerous',
          render: (_, record) => (
            <Tag color={record.dangerous ? 'red' : 'green'}>
              {record.dangerous ? 'dangerous' : 'normal'}
            </Tag>
          ),
        },
      ]}
    />
  );
}
