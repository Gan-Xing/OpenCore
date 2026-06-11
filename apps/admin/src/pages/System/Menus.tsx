import {
  createMenuSummariesFromRegistry,
  type MenuSummary,
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

const rows = createMenuSummariesFromRegistry();
const searchFields: CurrentPageSearchField<MenuSummary>[] = [
  'key',
  'title',
  'path',
  'permissionCode',
  'stage',
];
const filterOptions: CurrentPageFilterOption<MenuSummary>[] = [
  {
    key: 'stage',
    options: createCurrentPageFilterOptions(rows, 'stage'),
    placeholder: 'Stage',
    predicate: (record, value) => record.stage === value,
  },
];
const exportColumns: CurrentPageExportColumn<MenuSummary>[] = [
  { title: 'Key', dataIndex: 'key' },
  { title: 'Title', dataIndex: 'title' },
  { title: 'Path', dataIndex: 'path' },
  { title: 'Permission', dataIndex: 'permissionCode' },
  { title: 'Stage', dataIndex: 'stage' },
  { title: 'Order', dataIndex: 'order' },
];
const detailFields = (record: MenuSummary): DetailField[] => [
  { label: 'Key', value: record.key },
  { label: 'Title', value: record.title },
  { label: 'Path', value: record.path },
  { label: 'Permission', value: record.permissionCode },
  { label: 'Stage', value: record.stage },
  { label: 'Order', value: record.order },
];

export default function MenusPage() {
  return (
    <RbacTable<MenuSummary>
      title="Menus"
      rows={rows}
      detailFields={detailFields}
      detailTitle={(record) => record.title}
      readOnlyReason="Menus are module-registry managed and read-only in Admin."
      resource="core-menus"
      searchFields={searchFields}
      filterOptions={filterOptions}
      exportColumns={exportColumns}
      columns={[
        { title: 'Key', dataIndex: 'key' },
        { title: 'Title', dataIndex: 'title' },
        { title: 'Path', dataIndex: 'path' },
        { title: 'Permission', dataIndex: 'permissionCode' },
        {
          title: 'Stage',
          dataIndex: 'stage',
          render: (_, record) => <Tag>{record.stage}</Tag>,
        },
      ]}
    />
  );
}
