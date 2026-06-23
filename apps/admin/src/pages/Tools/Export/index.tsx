import { ReloadOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
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
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createOpenCoreExportPreview,
  getOpenCoreExportProtocol,
} from '@/services/opencore/platform';

type ExportPreviewFormValues = {
  columns: string;
  resource: string;
  rowCount: number;
};

type FormatMessage = (
  id: string,
  defaultMessage: string,
  values?: Record<string, number | string>,
) => string;

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
  const intl = useIntl();
  const [form] = Form.useForm<ExportPreviewFormValues>();
  const [protocol, setProtocol] = useState<CurrentPageExportProtocolSummary>();
  const [plan, setPlan] = useState<ExportPlanSummary>();
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [loadError, setLoadError] = useState<string>();
  const formatMessage: FormatMessage = useCallback(
    (id, defaultMessage, values) =>
      values
        ? intl.formatMessage({ id, defaultMessage }, values)
        : intl.formatMessage({ id, defaultMessage }),
    [intl],
  );
  const statusLabels = useMemo(
    () => ({
      active: formatMessage('pages.tools.export.status.active', 'active'),
      loading: formatMessage('pages.tools.export.status.loading', 'loading'),
    }),
    [formatMessage],
  );
  const booleanLabels = useMemo(
    () => ({
      disabled: formatMessage(
        'pages.tools.export.boolean.disabled',
        'disabled',
      ),
      enabled: formatMessage('pages.tools.export.boolean.enabled', 'enabled'),
    }),
    [formatMessage],
  );

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
          : formatMessage(
              'pages.tools.export.load.failure',
              'Unable to load export protocol.',
            ),
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
          : formatMessage(
              'pages.tools.export.preview.failure',
              'Unable to create export preview.',
            ),
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
      title={formatMessage('pages.tools.export.title', 'Live export protocol')}
      subTitle={formatMessage('pages.tools.export.section', 'Tools')}
      extra={[
        <Tooltip
          key="reload"
          title={formatMessage(
            'pages.tools.export.actions.reload',
            'Reload export protocol',
          )}
        >
          <Button
            aria-label={formatMessage(
              'pages.tools.export.actions.reloadAria',
              'Reload export protocol',
            )}
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
          message={formatMessage(
            'pages.tools.export.load.liveFailure',
            'Unable to load live export tooling',
          )}
          description={loadError}
          style={{ marginBlockEnd: 16 }}
        />
      ) : null}
      <Space size="large" style={{ marginBottom: 16 }} wrap>
        <Statistic
          title={formatMessage(
            'pages.tools.export.stats.protocolScope',
            'Protocol scope',
          )}
          value={protocol?.scope ?? '-'}
        />
        <Statistic
          title={formatMessage(
            'pages.tools.export.stats.serverCappedRows',
            'Server capped rows',
          )}
          value={protocol?.maxRows ?? 0}
        />
        <Statistic
          title={formatMessage(
            'pages.tools.export.stats.previewRows',
            'Preview rows',
          )}
          value={plan?.rowCount ?? 0}
        />
        <Tag color={protocol?.status === 'active' ? 'green' : 'blue'}>
          {protocol ? statusLabels[protocol.status] : statusLabels.loading}
        </Tag>
      </Space>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Card
          title={formatMessage('pages.tools.export.cards.protocol', 'Protocol')}
        >
          <Descriptions bordered column={1}>
            <Descriptions.Item
              label={formatMessage('pages.tools.export.fields.scope', 'Scope')}
            >
              {protocol?.scope ?? statusLabels.loading}
            </Descriptions.Item>
            <Descriptions.Item
              label={formatMessage(
                'pages.tools.export.fields.format',
                'Format',
              )}
            >
              {supportedFormats.map((format) => (
                <Tag key={format}>{format}</Tag>
              ))}
            </Descriptions.Item>
            <Descriptions.Item
              label={formatMessage(
                'pages.tools.export.fields.maxRows',
                'Max rows',
              )}
            >
              {protocol?.maxRows ?? statusLabels.loading}
            </Descriptions.Item>
            <Descriptions.Item
              label={formatMessage(
                'pages.tools.export.fields.asyncExport',
                'Async export',
              )}
            >
              {protocol?.asyncExport
                ? booleanLabels.enabled
                : booleanLabels.disabled}
            </Descriptions.Item>
            <Descriptions.Item
              label={formatMessage(
                'pages.tools.export.fields.sensitiveFieldPolicy',
                'Sensitive field policy',
              )}
            >
              {protocol?.sensitiveFieldPolicy ?? statusLabels.loading}
            </Descriptions.Item>
            <Descriptions.Item
              label={formatMessage(
                'pages.tools.export.fields.ownerPackage',
                'Owner package',
              )}
            >
              {protocol?.ownerPackage ?? statusLabels.loading}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card
          title={formatMessage(
            'pages.tools.export.cards.createPreview',
            'Create export preview',
          )}
        >
          <Form<ExportPreviewFormValues>
            form={form}
            initialValues={defaultPreviewValues}
            layout="vertical"
            onFinish={(values) => void createPreview(values)}
          >
            <Form.Item
              label={formatMessage(
                'pages.tools.export.fields.resource',
                'Resource',
              )}
              name="resource"
              rules={[
                {
                  required: true,
                  message: formatMessage(
                    'pages.tools.export.validation.resourceRequired',
                    'Resource is required.',
                  ),
                },
              ]}
            >
              <Input placeholder={defaultPreviewValues.resource} />
            </Form.Item>
            <Form.Item
              label={formatMessage(
                'pages.tools.export.fields.columns',
                'Columns',
              )}
              name="columns"
              rules={[
                {
                  required: true,
                  message: formatMessage(
                    'pages.tools.export.validation.columnsRequired',
                    'Columns are required.',
                  ),
                },
              ]}
            >
              <Input placeholder={defaultPreviewValues.columns} />
            </Form.Item>
            <Form.Item
              label={formatMessage(
                'pages.tools.export.fields.requestedRows',
                'Requested rows',
              )}
              name="rowCount"
              rules={[
                {
                  required: true,
                  message: formatMessage(
                    'pages.tools.export.validation.requestedRowsRequired',
                    'Requested rows are required.',
                  ),
                },
              ]}
            >
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={previewLoading}>
              {formatMessage(
                'pages.tools.export.actions.createPreview',
                'Create export preview',
              )}
            </Button>
          </Form>
        </Card>

        <Card
          title={formatMessage(
            'pages.tools.export.cards.boundedPreview',
            'Bounded row preview',
          )}
        >
          <Descriptions bordered column={1}>
            <Descriptions.Item
              label={formatMessage(
                'pages.tools.export.fields.resource',
                'Resource',
              )}
            >
              {plan?.resource ?? statusLabels.loading}
            </Descriptions.Item>
            <Descriptions.Item
              label={formatMessage(
                'pages.tools.export.fields.filename',
                'Filename',
              )}
            >
              {plan?.filename ?? statusLabels.loading}
            </Descriptions.Item>
            <Descriptions.Item
              label={formatMessage('pages.tools.export.fields.rows', 'Rows')}
            >
              {plan?.rowCount ?? statusLabels.loading}
            </Descriptions.Item>
            <Descriptions.Item
              label={formatMessage(
                'pages.tools.export.fields.generatedAt',
                'Generated at',
              )}
            >
              {plan?.generatedAt ?? statusLabels.loading}
            </Descriptions.Item>
            <Descriptions.Item
              label={formatMessage(
                'pages.tools.export.fields.columns',
                'Columns',
              )}
            >
              {exportColumns.map((column) => (
                <Tag key={column}>{column}</Tag>
              ))}
            </Descriptions.Item>
          </Descriptions>
          <Typography.Text type="secondary">
            {formatMessage(
              'pages.tools.export.policy.preview',
              'Preview requests use the live Tool Export API and cap row counts at the server protocol limit.',
            )}
          </Typography.Text>
        </Card>
      </Space>
    </PageContainer>
  );
}
