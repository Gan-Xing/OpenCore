import { createFileAssetFixtures, type FileAssetSummary } from '@opencore/sdk';
import { Tag, Typography } from 'antd';
import SystemManagementTable from './SystemManagementTable';

const rows = createFileAssetFixtures().items;

export default function FilesPage() {
  return (
    <SystemManagementTable<FileAssetSummary>
      title="File Center"
      rows={rows}
      columns={[
        { title: 'Name', dataIndex: 'originalName' },
        {
          title: 'MIME',
          dataIndex: 'mimeType',
          render: (_, record) => <Tag>{record.mimeType}</Tag>,
        },
        {
          title: 'Size',
          dataIndex: 'sizeBytes',
          render: (_, record) => (
            <Typography.Text>{record.sizeBytes} bytes</Typography.Text>
          ),
        },
        { title: 'Storage key', dataIndex: 'storageKey' },
        { title: 'Uploaded by', dataIndex: 'uploadedBy' },
      ]}
    />
  );
}
