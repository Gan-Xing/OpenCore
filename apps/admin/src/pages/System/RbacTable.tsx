import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';

type RbacRecord = {
  id?: string;
  code?: string;
  key?: string;
};

type RbacTableProps<T extends RbacRecord> = {
  title: string;
  rows: readonly T[];
  columns: ProColumns<T>[];
};

const RbacTable = <T extends RbacRecord>({
  title,
  rows,
  columns,
}: RbacTableProps<T>) => {
  return (
    <PageContainer title={title} subTitle="S6 RBAC">
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

export default RbacTable;
