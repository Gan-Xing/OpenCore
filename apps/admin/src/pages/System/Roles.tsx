import type { RoleSummary } from '@opencore/sdk';
import { createPermissionSummariesFromRegistry } from '@opencore/sdk';
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
import RbacTable from './RbacTable';

const allPermissionCodes = createPermissionSummariesFromRegistry().map(
  (permission) => permission.code,
);

const rows: RoleSummary[] = [
  {
    id: 'role_admin',
    code: 'admin',
    name: 'Administrator',
    permissionCodes: allPermissionCodes,
    system: true,
  },
  {
    id: 'role_viewer',
    code: 'viewer',
    name: 'Viewer',
    permissionCodes: [
      'core:dashboard:read',
      'tool:openapi:read',
      'core:user:read',
      'core:role:read',
      'core:permission:read',
      'core:menu:read',
    ],
    system: true,
  },
];
const searchFields: CurrentPageSearchField<RoleSummary>[] = [
  'code',
  'name',
  (record) => record.permissionCodes,
];
const filterOptions: CurrentPageFilterOption<RoleSummary>[] = [
  {
    key: 'system',
    options: [
      { label: 'system', value: 'true' },
      { label: 'custom', value: 'false' },
    ],
    placeholder: 'System',
    predicate: (record, value) => record.system === (value === 'true'),
  },
];
const exportColumns: CurrentPageExportColumn<RoleSummary>[] = [
  { title: 'ID', dataIndex: 'id' },
  { title: 'Code', dataIndex: 'code' },
  { title: 'Name', dataIndex: 'name' },
  {
    title: 'Permission Count',
    renderText: (record) => record.permissionCodes.length,
  },
  { title: 'System', dataIndex: 'system' },
];
const detailFields = (record: RoleSummary): DetailField[] => [
  { label: 'ID', value: record.id },
  { label: 'Code', value: record.code },
  { label: 'Name', value: record.name },
  { label: 'System', value: record.system ? 'system' : 'custom' },
  { label: 'Permission Count', value: record.permissionCodes.length },
];
const detailJsonSections = (record: RoleSummary): DetailJsonSection[] => [
  { title: 'Permission Codes', value: record.permissionCodes },
];

export default function RolesPage() {
  return (
    <RbacTable<RoleSummary>
      title="Roles"
      rows={rows}
      detailFields={detailFields}
      detailJsonSections={detailJsonSections}
      detailTitle={(record) => record.name}
      readOnlyReason="Fixture-backed roles are read-only until permission-guarded role writes are admitted."
      resource="core-roles"
      searchFields={searchFields}
      filterOptions={filterOptions}
      exportColumns={exportColumns}
      columns={[
        { title: 'Code', dataIndex: 'code' },
        { title: 'Name', dataIndex: 'name' },
        {
          title: 'Permissions',
          dataIndex: 'permissionCodes',
          render: (_, record) =>
            record.permissionCodes.length > 4 ? (
              <Typography.Text>
                {record.permissionCodes.length} permissions
              </Typography.Text>
            ) : (
              record.permissionCodes.map((code) => <Tag key={code}>{code}</Tag>)
            ),
        },
        {
          title: 'System',
          dataIndex: 'system',
          render: (_, record) => (
            <Tag color={record.system ? 'blue' : 'default'}>
              {record.system ? 'system' : 'custom'}
            </Tag>
          ),
        },
      ]}
    />
  );
}
