import { PageContainer } from '@ant-design/pro-components';
import {
  createCurrentPageExportProtocolFixture,
  createExportPlanFixture,
} from '@opencore/sdk';
import { Card, Descriptions, Space, Tag } from 'antd';

const protocol = createCurrentPageExportProtocolFixture();
const plan = createExportPlanFixture();
const supportedFormats: readonly string[] = protocol.supportedFormats;
const exportColumns: readonly string[] = plan.columns;

export default function ExportToolsPage() {
  return (
    <PageContainer title="Export Tools" subTitle="S8 Tool">
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Card title="Protocol">
          <Descriptions bordered column={1}>
            <Descriptions.Item label="Scope">
              {protocol.scope}
            </Descriptions.Item>
            <Descriptions.Item label="Format">
              {supportedFormats.map((format) => (
                <Tag key={format}>{format}</Tag>
              ))}
            </Descriptions.Item>
            <Descriptions.Item label="Max rows">
              {protocol.maxRows}
            </Descriptions.Item>
            <Descriptions.Item label="Async export">
              {protocol.asyncExport ? 'enabled' : 'disabled'}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="Preview">
          <Descriptions bordered column={1}>
            <Descriptions.Item label="Resource">
              {plan.resource}
            </Descriptions.Item>
            <Descriptions.Item label="Filename">
              {plan.filename}
            </Descriptions.Item>
            <Descriptions.Item label="Rows">{plan.rowCount}</Descriptions.Item>
            <Descriptions.Item label="Columns">
              {exportColumns.map((column) => (
                <Tag key={column}>{column}</Tag>
              ))}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      </Space>
    </PageContainer>
  );
}
