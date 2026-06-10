import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';

type SystemManagementRecord = {
  id?: string;
  code?: string;
  key?: string;
};

type SystemManagementTableProps<T extends SystemManagementRecord> = {
  title: string;
  rows: readonly T[];
  columns: ProColumns<T>[];
};

const SystemManagementTable = <T extends SystemManagementRecord>({
  title,
  rows,
  columns,
}: SystemManagementTableProps<T>) => {
  return (
    <PageContainer title={title} subTitle="S7 System">
      <ProTable<T>
        rowKey={(record) => String(record.id ?? record.code ?? record.key)}
        search={false}
        options={false}
        pagination={{
          pageSize: 10,
        }}
        dataSource={[...rows]}
        columns={columns}
      />
    </PageContainer>
  );
};

export default SystemManagementTable;
