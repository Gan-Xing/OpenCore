import { PageContainer, ProDescriptions } from '@ant-design/pro-components';
import { Tag, Typography } from 'antd';

const safetyRows = [
  {
    key: 'mode',
    label: 'Default mode',
    value: 'dry-run',
  },
  {
    key: 'write',
    label: 'Write confirmation',
    value: '--yes required',
  },
  {
    key: 'ownership',
    label: 'Overwrite policy',
    value: 'generated marker required',
  },
  {
    key: 'prisma',
    label: 'Prisma policy',
    value: 'draft and patch plan only',
  },
];

export default function OpenForgePage() {
  return (
    <PageContainer title="OpenForge" subTitle="S9 safe generator">
      <ProDescriptions
        column={1}
        dataSource={{
          templatePack: 'openforge-default-nest-umi-v1',
          applyMode: 'dry-run',
          rollback: 'manifest only',
          protectedPaths: '.env*, prisma/schema.prisma, prisma/migrations/**',
        }}
        columns={[
          {
            title: 'Template pack',
            dataIndex: 'templatePack',
          },
          {
            title: 'Apply mode',
            dataIndex: 'applyMode',
            render: (_, record) => <Tag color="blue">{record.applyMode}</Tag>,
          },
          {
            title: 'Rollback',
            dataIndex: 'rollback',
          },
          {
            title: 'Protected paths',
            dataIndex: 'protectedPaths',
          },
        ]}
      />
      <Typography.Title level={5}>Safety checks</Typography.Title>
      <ProDescriptions
        column={1}
        dataSource={{
          checks: safetyRows.map((item) => `${item.label}: ${item.value}`),
        }}
        columns={[
          {
            title: 'Checks',
            dataIndex: 'checks',
            render: (_, record) =>
              record.checks.map((item) => (
                <Typography.Paragraph key={item}>{item}</Typography.Paragraph>
              )),
          },
        ]}
      />
    </PageContainer>
  );
}
