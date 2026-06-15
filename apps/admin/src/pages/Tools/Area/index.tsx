import {
  CheckCircleOutlined,
  CloudUploadOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import { useAccess } from '@umijs/max';
import type {
  AreaDatasetImportRequest,
  AreaDatasetImportResultSummary,
  AreaDatasetSummary,
  AreaDatasetVersionSummary,
  AreaIpLookupSummary,
  AreaRegionSummary,
} from '@opencore/sdk';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  Space,
  Statistic,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import {
  importOpenCoreAreaDataset,
  listOpenCoreAreaDatasetVersions,
  listOpenCoreAreaRegions,
  lookupOpenCoreAreaIp,
} from '@/services/opencore/platform';

type RegionSearchValues = {
  query: string;
};

type IpLookupValues = {
  ip: string;
};

type ImportValues = {
  datasetJson: string;
};

const sampleImportJson = JSON.stringify(
  {
    version: 'opencore-area-admin-preview-v1',
    source: 'admin-json-preview',
    entries: [
      {
        code: 'ROOT',
        name: 'Root',
      },
      {
        code: 'ROOT-EDGE',
        name: 'Edge Lab',
        parentCode: 'ROOT',
        aliases: ['edge'],
        ipRanges: ['10.77.0.0/16'],
      },
    ],
  } satisfies AreaDatasetImportRequest,
  null,
  2,
);

const regionColumns: ProColumns<AreaRegionSummary>[] = [
  { title: 'Code', dataIndex: 'code', width: 160 },
  { title: 'Name', dataIndex: 'name' },
  {
    title: 'Parent',
    dataIndex: 'parentCode',
    render: (_, record) => record.parentCode ?? '-',
  },
  { title: 'Level', dataIndex: 'level', width: 90 },
  {
    title: 'Path',
    dataIndex: 'path',
    render: (_, record) => record.path.join(' / '),
  },
  {
    title: 'Aliases',
    dataIndex: 'aliases',
    render: (_, record) =>
      record.aliases.length > 0
        ? record.aliases.map((alias) => <Tag key={alias}>{alias}</Tag>)
        : '-',
  },
  {
    title: 'IP ranges',
    dataIndex: 'ipRanges',
    render: (_, record) =>
      record.ipRanges.length > 0
        ? record.ipRanges.map((range) => (
            <Tag key={range.cidr}>{range.cidr}</Tag>
          ))
        : '-',
  },
];

const versionColumns: ProColumns<AreaDatasetVersionSummary>[] = [
  { title: 'Version', dataIndex: 'version' },
  { title: 'Source', dataIndex: 'source' },
  { title: 'Regions', dataIndex: 'regionCount', width: 100 },
  { title: 'IP ranges', dataIndex: 'ipRangeCount', width: 110 },
  { title: 'Max depth', dataIndex: 'maxDepth', width: 110 },
  {
    title: 'Active',
    dataIndex: 'active',
    width: 90,
    render: (_, record) =>
      record.active ? <Tag color="green">active</Tag> : <Tag>stored</Tag>,
  },
  { title: 'Imported at', dataIndex: 'importedAt' },
];

export default function AreaDataPage() {
  const access = useAccess();
  const canImportAreaData = Boolean(access.canImportAreaData);
  const [regionForm] = Form.useForm<RegionSearchValues>();
  const [lookupForm] = Form.useForm<IpLookupValues>();
  const [importForm] = Form.useForm<ImportValues>();
  const [dataset, setDataset] = useState<AreaDatasetSummary>();
  const [versions, setVersions] = useState<
    readonly AreaDatasetVersionSummary[]
  >([]);
  const [regions, setRegions] = useState<readonly AreaRegionSummary[]>([]);
  const [lookupResult, setLookupResult] = useState<AreaIpLookupSummary>();
  const [importResult, setImportResult] =
    useState<AreaDatasetImportResultSummary>();
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [loadError, setLoadError] = useState<string>();

  const activeVersion = useMemo(
    () => versions.find((version) => version.active),
    [versions],
  );

  const loadAreaData = async (query = 'san') => {
    setLoading(true);
    try {
      const [nextVersions, nextRegions] = await Promise.all([
        listOpenCoreAreaDatasetVersions(),
        listOpenCoreAreaRegions({ limit: 50, query }),
      ]);
      const nextActive = nextVersions.versions.find((item) => item.active);
      setDataset(nextActive);
      setVersions(nextVersions.versions);
      setRegions(nextRegions.items);
      setLoadError(undefined);
    } catch (error: unknown) {
      setLoadError(
        error instanceof Error ? error.message : 'Unable to load area data.',
      );
    } finally {
      setLoading(false);
    }
  };

  const searchRegions = async (values: RegionSearchValues) => {
    setSearching(true);
    try {
      const result = await listOpenCoreAreaRegions({
        limit: 50,
        query: values.query?.trim() || undefined,
      });
      setRegions(result.items);
      setLoadError(undefined);
    } catch (error: unknown) {
      setLoadError(
        error instanceof Error
          ? error.message
          : 'Unable to query area regions.',
      );
    } finally {
      setSearching(false);
    }
  };

  const lookupIp = async (values: IpLookupValues) => {
    setLookupLoading(true);
    try {
      const result = await lookupOpenCoreAreaIp({ ip: values.ip.trim() });
      setLookupResult(result);
      setLoadError(undefined);
    } catch (error: unknown) {
      setLoadError(
        error instanceof Error
          ? error.message
          : 'Unable to lookup IP boundary.',
      );
    } finally {
      setLookupLoading(false);
    }
  };

  const importDataset = async (dryRun: boolean) => {
    setImportLoading(true);
    try {
      const values = importForm.getFieldsValue();
      const parsed = JSON.parse(values.datasetJson) as AreaDatasetImportRequest;
      const result = await importOpenCoreAreaDataset({
        ...parsed,
        dryRun,
      });
      setImportResult(result);
      setLoadError(undefined);
      message.success(
        dryRun ? 'Area import dry-run passed.' : 'Area dataset activated.',
      );
      if (!dryRun) {
        await loadAreaData('');
      }
    } catch (error: unknown) {
      setLoadError(
        error instanceof Error
          ? error.message
          : 'Unable to import area dataset.',
      );
    } finally {
      setImportLoading(false);
    }
  };

  useEffect(() => {
    regionForm.setFieldsValue({ query: 'san' });
    lookupForm.setFieldsValue({ ip: '203.0.113.7' });
    importForm.setFieldsValue({ datasetJson: sampleImportJson });
    void loadAreaData();
  }, [importForm, lookupForm, regionForm]);

  return (
    <PageContainer
      title="Area data boundary"
      subTitle="Tool Area"
      extra={[
        <Tooltip key="reload" title="Reload area dataset">
          <Button
            aria-label="Reload area dataset"
            icon={<ReloadOutlined />}
            loading={loading}
            onClick={() => void loadAreaData(regionForm.getFieldValue('query'))}
          />
        </Tooltip>,
      ]}
    >
      {loadError ? (
        <Alert
          showIcon
          type="warning"
          message="Area data live API unavailable"
          description={loadError}
          style={{ marginBlockEnd: 16 }}
        />
      ) : null}

      <Space size="large" style={{ marginBottom: 16 }} wrap>
        <Statistic title="Active version" value={dataset?.version ?? '-'} />
        <Statistic title="Regions" value={dataset?.regionCount ?? 0} />
        <Statistic title="IP ranges" value={dataset?.ipRangeCount ?? 0} />
        <Statistic title="Max depth" value={dataset?.maxDepth ?? 0} />
        <Tag color={activeVersion ? 'green' : 'blue'}>tool:area:read</Tag>
        <Tag color={canImportAreaData ? 'gold' : 'default'}>
          tool:area:import
        </Tag>
      </Space>

      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Card title="Area dataset versions">
          <ProTable<AreaDatasetVersionSummary>
            columns={versionColumns}
            dataSource={versions}
            loading={loading}
            pagination={false}
            rowKey="version"
            search={false}
            toolBarRender={false}
          />
        </Card>

        <Card title="Area region query">
          <Form<RegionSearchValues>
            form={regionForm}
            layout="inline"
            onFinish={(values) => void searchRegions(values)}
            style={{ marginBottom: 16 }}
          >
            <Form.Item name="query">
              <Input allowClear placeholder="Search code, name, alias, path" />
            </Form.Item>
            <Button
              htmlType="submit"
              icon={<SearchOutlined />}
              loading={searching}
              type="primary"
            >
              Search regions
            </Button>
          </Form>
          <ProTable<AreaRegionSummary>
            columns={regionColumns}
            dataSource={regions}
            loading={loading || searching}
            pagination={{ pageSize: 10 }}
            rowKey="code"
            search={false}
            toolBarRender={false}
          />
        </Card>

        <Card title="IP boundary lookup">
          <Form<IpLookupValues>
            form={lookupForm}
            layout="inline"
            onFinish={(values) => void lookupIp(values)}
            style={{ marginBottom: 16 }}
          >
            <Form.Item
              name="ip"
              rules={[{ required: true, message: 'IP is required.' }]}
            >
              <Input placeholder="203.0.113.7" />
            </Form.Item>
            <Button
              htmlType="submit"
              icon={<SearchOutlined />}
              loading={lookupLoading}
              type="primary"
            >
              Lookup IP boundary
            </Button>
          </Form>
          <Descriptions bordered column={1}>
            <Descriptions.Item label="Normalized IP">
              {lookupResult?.normalizedIp ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Network type">
              {lookupResult?.networkType ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Location">
              {lookupResult?.location ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Matched region">
              {lookupResult?.region ? (
                <Space>
                  <Tag color="green">{lookupResult.region.code}</Tag>
                  <Typography.Text>{lookupResult.region.name}</Typography.Text>
                </Space>
              ) : (
                '-'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Matched range">
              {lookupResult?.range?.cidr ?? '-'}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="Area dataset import">
          <Form<ImportValues> form={importForm} layout="vertical">
            <Form.Item
              label="Dataset JSON"
              name="datasetJson"
              rules={[{ required: true, message: 'Dataset JSON is required.' }]}
            >
              <Input.TextArea rows={10} />
            </Form.Item>
            <Space wrap>
              <Button
                icon={<CheckCircleOutlined />}
                loading={importLoading}
                onClick={() => void importDataset(true)}
              >
                Validate area import
              </Button>
              <Tooltip title="Requires tool:area:import">
                <Button
                  disabled={!canImportAreaData}
                  icon={<CloudUploadOutlined />}
                  loading={importLoading}
                  onClick={() => void importDataset(false)}
                  type="primary"
                >
                  Activate area import
                </Button>
              </Tooltip>
            </Space>
          </Form>
          {importResult ? (
            <Descriptions bordered column={1} style={{ marginTop: 16 }}>
              <Descriptions.Item label="Dry run">
                {importResult.dryRun ? 'yes' : 'no'}
              </Descriptions.Item>
              <Descriptions.Item label="Applied">
                {importResult.applied ? 'yes' : 'no'}
              </Descriptions.Item>
              <Descriptions.Item label="Version">
                {importResult.dataset.version}
              </Descriptions.Item>
              <Descriptions.Item label="Checksum">
                <Typography.Text copyable>
                  {importResult.dataset.checksum}
                </Typography.Text>
              </Descriptions.Item>
              <Descriptions.Item label="Warnings">
                {importResult.warnings.length > 0
                  ? importResult.warnings.join('; ')
                  : '-'}
              </Descriptions.Item>
            </Descriptions>
          ) : null}
        </Card>
      </Space>
    </PageContainer>
  );
}
