import type { RoleSummary } from '@opencore/sdk';
import { createPermissionSummariesFromRegistry } from '@opencore/sdk';
import { Tag, Typography } from 'antd';
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

export default function RolesPage() {
  return (
    <RbacTable<RoleSummary>
      title="Roles"
      rows={rows}
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
