import { ReloadOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import type {
  CurrentPageExportProtocolSummary,
  ExportPlanSummary,
} from '@opencore/sdk';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Space,
  Statistic,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import {
  createOpenCoreExportPreview,
  getOpenCoreExportProtocol,
} from '@/services/opencore/platform';

type ExportPreviewFormValues = {
  columns: string;
  resource: string;
  rowCount: number;
};

const defaultPreviewValues: ExportPreviewFormValues = {
  resource: 'system-users',
  columns: 'username,displayName,email,status',
  rowCount: 1200,
};

function parseColumns(value: string): readonly string[] {
  return value
    .split(',')
    .map((column) => column.trim())
    .filter(Boolean);
}

export default function ExportToolsPage() {
  const [form] = Form.useForm<ExportPreviewFormValues>();
  const [protocol, setProtocol] = useState<CurrentPageExportProtocolSummary>();
  const [plan, setPlan] = useState<ExportPlanSummary>();
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [loadError, setLoadError] = useState<string>();

  const supportedFormats = useMemo<readonly string[]>(
    () => protocol?.supportedFormats ?? [],
    [protocol],
  );
  const exportColumns = useMemo<readonly string[]>(
    () => plan?.columns ?? [],
    [plan],
  );

  const loadProtocol = async () => {
    setLoading(true);
    try {
      const nextProtocol = await getOpenCoreExportProtocol();
      setProtocol(nextProtocol);
      setLoadError(undefined);
    } catch (error: unknown) {
      setLoadError(
        error instanceof Error
          ? error.message
          : 'Unable to load export protocol.',
      );
    } finally {
      setLoading(false);
    }
  };

  const createPreview = async (values: ExportPreviewFormValues) => {
    setPreviewLoading(true);
    try {
      const nextPlan = await createOpenCoreExportPreview({
        resource: values.resource.trim(),
        columns: parseColumns(values.columns),
        rowCount: values.rowCount,
      });
      setPlan(nextPlan);
      setLoadError(undefined);
    } catch (error: unknown) {
      setLoadError(
        error instanceof Error
          ? error.message
          : 'Unable to create export preview.',
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  const reloadAll = async () => {
    await loadProtocol();
    await createPreview(form.getFieldsValue());
  };

  useEffect(() => {
    void loadProtocol();
    void createPreview(defaultPreviewValues);
  }, []);

  return (
    <PageContainer
      title="Live export protocol"
      subTitle="S8 Tool"
      extra={[
        <Tooltip key="reload" title="Reload export protocol">
          <Button
            aria-label="Reload export protocol"
            icon={<ReloadOutlined />}
            loading={loading || previewLoading}
            onClick={() => void reloadAll()}
          />
        </Tooltip>,
      ]}
    >
      {loadError ? (
        <Alert
          showIcon
          type="warning"
          message="Unable to load live export tooling"
          description={loadError}
          style={{ marginBlockEnd: 16 }}
        />
      ) : null}
      <Space size="large" style={{ marginBottom: 16 }} wrap>
        <Statistic title="Protocol scope" value={protocol?.scope ?? '-'} />
        <Statistic title="Server capped rows" value={protocol?.maxRows ?? 0} />
        <Statistic title="Preview rows" value={plan?.rowCount ?? 0} />
        <Tag color={protocol?.status === 'active' ? 'green' : 'blue'}>
          {protocol?.status ?? 'loading'}
        </Tag>
      </Space>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Card title="Protocol">
          <Descriptions bordered column={1}>
            <Descriptions.Item label="Scope">
              {protocol?.scope ?? 'loading'}
            </Descriptions.Item>
            <Descriptions.Item label="Format">
              {supportedFormats.map((format) => (
                <Tag key={format}>{format}</Tag>
              ))}
            </Descriptions.Item>
            <Descriptions.Item label="Max rows">
              {protocol?.maxRows ?? 'loading'}
            </Descriptions.Item>
            <Descriptions.Item label="Async export">
              {protocol?.asyncExport ? 'enabled' : 'disabled'}
            </Descriptions.Item>
            <Descriptions.Item label="Sensitive field policy">
              {protocol?.sensitiveFieldPolicy ?? 'loading'}
            </Descriptions.Item>
            <Descriptions.Item label="Owner package">
              {protocol?.ownerPackage ?? 'loading'}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="Create export preview">
          <Form<ExportPreviewFormValues>
            form={form}
            initialValues={defaultPreviewValues}
            layout="vertical"
            onFinish={(values) => void createPreview(values)}
          >
            <Form.Item
              label="Resource"
              name="resource"
              rules={[{ required: true, message: 'Resource is required.' }]}
            >
              <Input placeholder="system-users" />
            </Form.Item>
            <Form.Item
              label="Columns"
              name="columns"
              rules={[{ required: true, message: 'Columns are required.' }]}
            >
              <Input placeholder="username,displayName,email,status" />
            </Form.Item>
            <Form.Item
              label="Requested rows"
              name="rowCount"
              rules={[
                { required: true, message: 'Requested rows are required.' },
              ]}
            >
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={previewLoading}>
              Create export preview
            </Button>
          </Form>
        </Card>

        <Card title="Bounded row preview">
          <Descriptions bordered column={1}>
            <Descriptions.Item label="Resource">
              {plan?.resource ?? 'loading'}
            </Descriptions.Item>
            <Descriptions.Item label="Filename">
              {plan?.filename ?? 'loading'}
            </Descriptions.Item>
            <Descriptions.Item label="Rows">
              {plan?.rowCount ?? 'loading'}
            </Descriptions.Item>
            <Descriptions.Item label="Generated at">
              {plan?.generatedAt ?? 'loading'}
            </Descriptions.Item>
            <Descriptions.Item label="Columns">
              {exportColumns.map((column) => (
                <Tag key={column}>{column}</Tag>
              ))}
            </Descriptions.Item>
          </Descriptions>
          <Typography.Text type="secondary">
            Preview requests use the live Tool Export API and cap row counts at
            the server protocol limit.
          </Typography.Text>
        </Card>
      </Space>
    </PageContainer>
  );
}
