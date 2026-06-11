import {
  createSystemConfigFixtures,
  type SystemConfigSummary,
} from '@opencore/sdk';
import { Tag } from 'antd';
import type { CurrentPageExportColumn } from '../shared/CurrentPageExportButton';
import {
  createCurrentPageFilterOptions,
  type CurrentPageFilterOption,
  type CurrentPageSearchField,
} from '../shared/CurrentPageFilters';
import type { DetailField } from '../shared/ReadOnlyDetailDrawer';
import SystemManagementTable from './SystemManagementTable';

const rows = createSystemConfigFixtures().items;
const searchFields: CurrentPageSearchField<SystemConfigSummary>[] = [
  'key',
  'valueType',
  'description',
  'visibility',
];
const filterOptions: CurrentPageFilterOption<SystemConfigSummary>[] = [
  {
    key: 'valueType',
    options: createCurrentPageFilterOptions(rows, 'valueType'),
    placeholder: 'Type',
    predicate: (record, value) => record.valueType === value,
  },
  {
    key: 'visibility',
    options: createCurrentPageFilterOptions(rows, 'visibility'),
    placeholder: 'Visibility',
    predicate: (record, value) => record.visibility === value,
  },
  {
    key: 'public',
    options: [
      { label: 'public', value: 'true' },
      { label: 'private', value: 'false' },
    ],
    placeholder: 'Public',
    predicate: (record, value) => record.public === (value === 'true'),
  },
];
const formatConfigValue = (record: SystemConfigSummary) =>
  record.visibility === 'secret' ? '[redacted]' : record.value;
const exportColumns: CurrentPageExportColumn<SystemConfigSummary>[] = [
  { title: 'ID', dataIndex: 'id' },
  { title: 'Key', dataIndex: 'key' },
  {
    title: 'Value',
    renderText: formatConfigValue,
  },
  { title: 'Type', dataIndex: 'valueType' },
  { title: 'Visibility', dataIndex: 'visibility' },
  { title: 'Public', dataIndex: 'public' },
  { title: 'Description', dataIndex: 'description' },
];
const detailFields = (record: SystemConfigSummary): DetailField[] => [
  { label: 'ID', value: record.id },
  { label: 'Key', value: record.key },
  { label: 'Value', value: formatConfigValue(record) },
  { label: 'Type', value: record.valueType },
  { label: 'Visibility', value: record.visibility },
  { label: 'Public', value: record.public ? 'public' : 'private' },
  { label: 'Description', value: record.description },
];

export default function ConfigPage() {
  return (
    <SystemManagementTable<SystemConfigSummary>
      title="System Config"
      rows={rows}
      detailFields={detailFields}
      detailTitle={(record) => record.key}
      readOnlyReason="System config is read-only here; secret values stay redacted."
      resource="core-config"
      searchFields={searchFields}
      filterOptions={filterOptions}
      exportColumns={exportColumns}
      columns={[
        { title: 'Key', dataIndex: 'key' },
        { title: 'Value', dataIndex: 'value' },
        {
          title: 'Type',
          dataIndex: 'valueType',
          render: (_, record) => <Tag>{record.valueType}</Tag>,
        },
        {
          title: 'Visibility',
          dataIndex: 'visibility',
          render: (_, record) => (
            <Tag color={record.visibility === 'secret' ? 'red' : 'default'}>
              {record.visibility}
            </Tag>
          ),
        },
      ]}
    />
  );
}
