import { createDictFixtures, type DictTypeSummary } from '@opencore/sdk';
import { Tag, Typography } from 'antd';
import type { CurrentPageExportColumn } from '../shared/CurrentPageExportButton';
import type {
  CurrentPageFilterOption,
  CurrentPageSearchField,
} from '../shared/CurrentPageFilters';
import type {
  DetailField,
  DetailJsonSection,
} from '../shared/ReadOnlyDetailDrawer';
import SystemManagementTable from './SystemManagementTable';

const rows = createDictFixtures().items;
const searchFields: CurrentPageSearchField<DictTypeSummary>[] = [
  'code',
  'name',
  'description',
  (record) => record.items.map((item) => `${item.label} ${item.value}`),
];
const filterOptions: CurrentPageFilterOption<DictTypeSummary>[] = [
  {
    key: 'enabled',
    options: [
      { label: 'enabled', value: 'true' },
      { label: 'disabled', value: 'false' },
    ],
    placeholder: 'Status',
    predicate: (record, value) => record.enabled === (value === 'true'),
  },
];
const exportColumns: CurrentPageExportColumn<DictTypeSummary>[] = [
  { title: 'ID', dataIndex: 'id' },
  { title: 'Code', dataIndex: 'code' },
  { title: 'Name', dataIndex: 'name' },
  { title: 'Description', dataIndex: 'description' },
  { title: 'Item Count', renderText: (record) => record.items.length },
  { title: 'Enabled', dataIndex: 'enabled' },
];
const detailFields = (record: DictTypeSummary): DetailField[] => [
  { label: 'ID', value: record.id },
  { label: 'Code', value: record.code },
  { label: 'Name', value: record.name },
  { label: 'Description', value: record.description },
  { label: 'Status', value: record.enabled ? 'enabled' : 'disabled' },
  { label: 'Item Count', value: record.items.length },
];
const detailJsonSections = (record: DictTypeSummary): DetailJsonSection[] => [
  { title: 'Items', value: record.items },
];

export default function DictsPage() {
  return (
    <SystemManagementTable<DictTypeSummary>
      title="Dictionaries"
      rows={rows}
      detailFields={detailFields}
      detailJsonSections={detailJsonSections}
      detailTitle={(record) => record.name}
      readOnlyReason="Dictionary fixtures are read-only until S7 write workflows are admitted."
      resource="core-dicts"
      searchFields={searchFields}
      filterOptions={filterOptions}
      exportColumns={exportColumns}
      columns={[
        { title: 'Code', dataIndex: 'code' },
        { title: 'Name', dataIndex: 'name' },
        {
          title: 'Items',
          dataIndex: 'items',
          render: (_, record) => (
            <Typography.Text>{record.items.length} items</Typography.Text>
          ),
        },
        {
          title: 'Status',
          dataIndex: 'enabled',
          render: (_, record) => (
            <Tag color={record.enabled ? 'green' : 'red'}>
              {record.enabled ? 'enabled' : 'disabled'}
            </Tag>
          ),
        },
      ]}
    />
  );
}
