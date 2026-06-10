import { PageContainer } from '@ant-design/pro-components';
import { createVersionInfoFixture } from '@opencore/sdk';
import { Descriptions } from 'antd';

const version = createVersionInfoFixture();

export default function VersionPage() {
  return (
    <PageContainer title="Version" subTitle="S8 Monitor">
      <Descriptions bordered column={1}>
        <Descriptions.Item label="Name">{version.name}</Descriptions.Item>
        <Descriptions.Item label="Version">{version.version}</Descriptions.Item>
        <Descriptions.Item label="Commit">{version.commit}</Descriptions.Item>
        <Descriptions.Item label="Build time">
          {version.buildTime}
        </Descriptions.Item>
        <Descriptions.Item label="Node">
          {version.nodeVersion}
        </Descriptions.Item>
      </Descriptions>
    </PageContainer>
  );
}
