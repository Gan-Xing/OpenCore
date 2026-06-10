import {
  createMenuSummariesFromRegistry,
  type MenuSummary,
} from '@opencore/sdk';
import { Tag } from 'antd';
import RbacTable from './RbacTable';

const rows = createMenuSummariesFromRegistry();

export default function MenusPage() {
  return (
    <RbacTable<MenuSummary>
      title="Menus"
      rows={rows}
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
