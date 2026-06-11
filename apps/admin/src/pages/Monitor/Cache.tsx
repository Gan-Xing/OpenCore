import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import { createOperationsFixtures, type CacheKeySummary } from '@opencore/sdk';
import { Tag } from 'antd';
import {
  createCurrentPageFilterOptions,
  useCurrentPageFilters,
  type CurrentPageFilterOption,
  type CurrentPageSearchField,
} from '../shared/CurrentPageFilters';

const rows = createOperationsFixtures().cacheKeys;
const searchFields: CurrentPageSearchField<CacheKeySummary>[] = [
  'key',
  'prefix',
];
const filterOptions: CurrentPageFilterOption<CacheKeySummary>[] = [
  {
    key: 'prefix',
    options: createCurrentPageFilterOptions(rows, 'prefix'),
    placeholder: 'Prefix',
    predicate: (record, value) => record.prefix === value,
  },
];

const columns: ProColumns<CacheKeySummary>[] = [
  { title: 'Key', dataIndex: 'key' },
  { title: 'Prefix', dataIndex: 'prefix' },
  { title: 'TTL', dataIndex: 'ttlSeconds' },
  { title: 'Size', dataIndex: 'sizeBytes' },
  {
    title: 'Policy',
    render: () => <Tag color="orange">prefix clear requires confirm</Tag>,
  },
];

export default function CachePage() {
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<CacheKeySummary>({
      rows,
      searchFields,
      searchPlaceholder: 'Search cache',
      selectFilters: filterOptions,
    });

  return (
    <PageContainer title="Cache" subTitle="S11 Operations">
      <ProTable<CacheKeySummary>
        rowKey="key"
        search={false}
        options={false}
        toolBarRender={() => [filterToolbar]}
        pagination={false}
        dataSource={filteredRows}
        columns={columns}
      />
    </PageContainer>
  );
}
