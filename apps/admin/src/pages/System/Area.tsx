import {
  CheckCircleOutlined,
  CloudUploadOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useAccess, useIntl } from '@umijs/max';
import type {
  AreaDatasetImportRequest,
  AreaDatasetImportResultSummary,
  AreaDatasetSummary,
  AreaDatasetVersionSummary,
  AreaIpLookupSummary,
  AreaRegionFormatSummary,
  AreaRegionSummary,
  AreaRegionTreeSummary,
} from '@opencore/sdk';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Empty,
  Form,
  Input,
  InputNumber,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
  type TableColumnsType,
} from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AreaCascader from '@/components/AreaCascader';
import {
  activateOpenCoreAreaDatasetVersion,
  formatOpenCoreAreaRegion,
  importOpenCoreAreaDataset,
  listOpenCoreAreaDatasetVersions,
  listOpenCoreAreaRegions,
  listOpenCoreAreaTree,
  lookupOpenCoreAreaIp,
} from '@/services/opencore/platform';

type RegionSearchValues = {
  level?: number;
  query?: string;
};

type IpLookupValues = {
  ip: string;
};

type ImportValues = {
  datasetJson: string;
};

type FormatMessage = (
  id: string,
  defaultMessage: string,
  values?: Record<string, number | string>,
) => string;

const areaReadPermissionCode = 'system:area:read';
const areaImportPermissionCode = 'system:area:import';
const areaManagePermissionCode = 'system:area:manage';

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

function createRegionColumns(
  formatMessage: FormatMessage,
): TableColumnsType<AreaRegionSummary> {
  return [
    {
      dataIndex: 'code',
      title: formatMessage('pages.system.area.fields.code', '编码'),
      width: 160,
    },
    {
      dataIndex: 'name',
      title: formatMessage('pages.system.area.fields.name', '名称'),
      width: 180,
    },
    {
      dataIndex: 'level',
      title: formatMessage('pages.system.area.fields.level', '层级'),
      width: 88,
    },
    {
      dataIndex: 'parentCode',
      render: (_, record) => record.parentCode ?? '-',
      title: formatMessage('pages.system.area.fields.parent', '上级'),
      width: 150,
    },
    {
      dataIndex: 'path',
      render: (_, record) => record.path.join(' / '),
      title: formatMessage('pages.system.area.fields.path', '路径'),
      width: 260,
    },
    {
      dataIndex: 'aliases',
      render: (_, record) =>
        record.aliases.length > 0
          ? record.aliases.map((alias) => <Tag key={alias}>{alias}</Tag>)
          : '-',
      title: formatMessage('pages.system.area.fields.aliases', '别名'),
      width: 180,
    },
    {
      dataIndex: 'ipRanges',
      render: (_, record) =>
        record.ipRanges.length > 0
          ? record.ipRanges.map((range) => (
              <Tag key={range.cidr}>{range.cidr}</Tag>
            ))
          : '-',
      title: formatMessage('pages.system.area.fields.ipRanges', 'IP 段'),
      width: 220,
    },
  ];
}

function createTreeColumns(
  formatMessage: FormatMessage,
): TableColumnsType<AreaRegionTreeSummary> {
  return createRegionColumns(
    formatMessage,
  ) as TableColumnsType<AreaRegionTreeSummary>;
}

function safeParseImportJson(value: string): AreaDatasetImportRequest {
  const parsed = JSON.parse(value) as AreaDatasetImportRequest;
  return parsed;
}

export default function SystemAreaPage() {
  const access = useAccess();
  const intl = useIntl();
  const canImportAreaData = Boolean(access.canImportAreaData);
  const canManageAreaData = Boolean(access.canManageAreaData);
  const [regionForm] = Form.useForm<RegionSearchValues>();
  const [lookupForm] = Form.useForm<IpLookupValues>();
  const [importForm] = Form.useForm<ImportValues>();
  const [dataset, setDataset] = useState<AreaDatasetSummary>();
  const [versions, setVersions] = useState<
    readonly AreaDatasetVersionSummary[]
  >([]);
  const [regions, setRegions] = useState<readonly AreaRegionSummary[]>([]);
  const [tree, setTree] = useState<readonly AreaRegionTreeSummary[]>([]);
  const [selectedPath, setSelectedPath] = useState<readonly string[]>([]);
  const [formatResult, setFormatResult] = useState<AreaRegionFormatSummary>();
  const [lookupResult, setLookupResult] = useState<AreaIpLookupSummary>();
  const [importResult, setImportResult] =
    useState<AreaDatasetImportResultSummary>();
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [activatingVersion, setActivatingVersion] = useState<string>();
  const [loadError, setLoadError] = useState<string>();

  const formatMessage: FormatMessage = useCallback(
    (id, defaultMessage, values) =>
      values
        ? intl.formatMessage({ id, defaultMessage }, values)
        : intl.formatMessage({ id, defaultMessage }),
    [intl],
  );
  const regionColumns = useMemo(
    () => createRegionColumns(formatMessage),
    [formatMessage],
  );
  const treeColumns = useMemo(
    () => createTreeColumns(formatMessage),
    [formatMessage],
  );
  const activeVersion = versions.find((version) => version.active);

  const loadAreaData = useCallback(
    async (query?: RegionSearchValues) => {
      setLoading(true);
      try {
        const [nextVersions, nextRegions, nextTree] = await Promise.all([
          listOpenCoreAreaDatasetVersions(),
          listOpenCoreAreaRegions({
            level: query?.level,
            limit: 100,
            query: query?.query?.trim() || undefined,
          }),
          listOpenCoreAreaTree(),
        ]);
        const nextActive = nextVersions.versions.find((item) => item.active);
        setDataset(nextActive);
        setVersions(nextVersions.versions);
        setRegions(nextRegions.items);
        setTree(nextTree.items);
        setLoadError(undefined);
      } catch (error: unknown) {
        setLoadError(
          error instanceof Error
            ? error.message
            : formatMessage(
                'pages.system.area.load.failure',
                '无法加载地区数据。',
              ),
        );
      } finally {
        setLoading(false);
      }
    },
    [formatMessage],
  );

  useEffect(() => {
    void loadAreaData();
    importForm.setFieldsValue({ datasetJson: sampleImportJson });
  }, [importForm, loadAreaData]);

  const searchRegions = async (values: RegionSearchValues) => {
    setSearching(true);
    try {
      const result = await listOpenCoreAreaRegions({
        level: values.level,
        limit: 100,
        query: values.query?.trim() || undefined,
      });
      setRegions(result.items);
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage('pages.system.area.query.failure', '无法查询地区。'),
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
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.system.area.lookup.failure',
              '无法查询 IP 边界。',
            ),
      );
    } finally {
      setLookupLoading(false);
    }
  };

  const previewSelectedArea = async (path: readonly string[]) => {
    setSelectedPath(path);
    const code = path.at(-1);
    if (!code) {
      setFormatResult(undefined);
      return;
    }

    try {
      setFormatResult(
        await formatOpenCoreAreaRegion({
          code,
          separator: ' / ',
        }),
      );
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.system.area.format.failure',
              '无法格式化地区路径。',
            ),
      );
    }
  };

  const submitImport = async (dryRun: boolean) => {
    const values = await importForm.validateFields();
    setImportLoading(true);
    try {
      const payload = safeParseImportJson(values.datasetJson);
      const result = await importOpenCoreAreaDataset({ ...payload, dryRun });
      setImportResult(result);
      message.success(
        dryRun
          ? formatMessage(
              'pages.system.area.messages.dryRunPassed',
              '地区导入预演通过。',
            )
          : formatMessage(
              'pages.system.area.messages.datasetActivated',
              '地区数据集已激活。',
            ),
      );
      if (!dryRun) {
        await loadAreaData(regionForm.getFieldsValue());
      }
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.system.area.import.failure',
              '无法导入地区数据集。',
            ),
      );
    } finally {
      setImportLoading(false);
    }
  };

  const activateVersion = async (version: string) => {
    setActivatingVersion(version);
    try {
      await activateOpenCoreAreaDatasetVersion(version);
      message.success(
        formatMessage(
          'pages.system.area.messages.versionActivated',
          '地区数据集版本已激活。',
        ),
      );
      await loadAreaData(regionForm.getFieldsValue());
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.system.area.activate.failure',
              '无法激活地区数据集版本。',
            ),
      );
    } finally {
      setActivatingVersion(undefined);
    }
  };

  const versionColumns: TableColumnsType<AreaDatasetVersionSummary> = [
    {
      dataIndex: 'version',
      title: formatMessage('pages.system.area.fields.version', '版本'),
      width: 220,
    },
    {
      dataIndex: 'source',
      title: formatMessage('pages.system.area.fields.source', '来源'),
      width: 180,
    },
    {
      dataIndex: 'active',
      render: (_, record) =>
        record.active ? (
          <Tag color="green">
            {formatMessage('pages.system.area.versionState.active', '活跃')}
          </Tag>
        ) : (
          <Tag>
            {formatMessage('pages.system.area.versionState.stored', '已存储')}
          </Tag>
        ),
      title: formatMessage('pages.system.area.fields.active', '状态'),
      width: 110,
    },
    {
      dataIndex: 'regionCount',
      title: formatMessage('pages.system.area.fields.regions', '地区数'),
      width: 100,
    },
    {
      dataIndex: 'ipRangeCount',
      title: formatMessage('pages.system.area.fields.ipRanges', 'IP 段'),
      width: 100,
    },
    {
      dataIndex: 'checksum',
      ellipsis: true,
      title: formatMessage('pages.system.area.fields.checksum', '校验和'),
      width: 260,
    },
    {
      render: (_, record) => (
        <Button
          disabled={record.active || !canManageAreaData}
          loading={activatingVersion === record.version}
          onClick={() => void activateVersion(record.version)}
          size="small"
          type="link"
        >
          {formatMessage('pages.system.area.actions.activate', '激活')}
        </Button>
      ),
      title: formatMessage('pages.system.area.actions.column', '操作'),
      width: 110,
    },
  ];

  const tabItems = [
    {
      key: 'tree',
      label: formatMessage('pages.system.area.tabs.tree', '地区树'),
      children: (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Card
            title={formatMessage(
              'pages.system.area.cards.reusableSelector',
              '通用地区选择器',
            )}
          >
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <AreaCascader
                maxLevel={dataset?.maxDepth}
                onChange={(value) => void previewSelectedArea(value)}
                placeholder={formatMessage(
                  'pages.system.area.cascader.placeholder',
                  '选择地区并预览格式化路径',
                )}
                style={{ maxWidth: 520, width: '100%' }}
                value={selectedPath}
              />
              {formatResult ? (
                <Descriptions bordered column={1} size="small">
                  <Descriptions.Item
                    label={formatMessage(
                      'pages.system.area.fields.formatted',
                      '格式化结果',
                    )}
                  >
                    {formatResult.formatted}
                  </Descriptions.Item>
                  <Descriptions.Item
                    label={formatMessage(
                      'pages.system.area.fields.path',
                      '路径',
                    )}
                  >
                    {formatResult.path.join(' / ')}
                  </Descriptions.Item>
                </Descriptions>
              ) : null}
            </Space>
          </Card>
          <Card
            title={formatMessage(
              'pages.system.area.cards.treeTable',
              '虚拟化地区树表格',
            )}
          >
            <Form
              form={regionForm}
              layout="inline"
              onFinish={(values) => void searchRegions(values)}
              style={{ marginBottom: 16, rowGap: 12 }}
            >
              <Form.Item name="query">
                <Input
                  allowClear
                  placeholder={formatMessage(
                    'pages.system.area.search.placeholder',
                    '搜索编码、名称、别名、路径',
                  )}
                  style={{ width: 240 }}
                />
              </Form.Item>
              <Form.Item name="level">
                <InputNumber
                  max={dataset?.maxDepth ?? 6}
                  min={1}
                  placeholder={formatMessage(
                    'pages.system.area.search.level',
                    '层级',
                  )}
                  style={{ width: 120 }}
                />
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button
                    htmlType="submit"
                    icon={<SearchOutlined />}
                    loading={searching}
                    type="primary"
                  >
                    {formatMessage(
                      'pages.system.area.actions.searchRegions',
                      '搜索地区',
                    )}
                  </Button>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() =>
                      void loadAreaData(regionForm.getFieldsValue())
                    }
                  >
                    {formatMessage(
                      'pages.system.area.actions.reload',
                      '刷新地区数据集',
                    )}
                  </Button>
                </Space>
              </Form.Item>
            </Form>
            <Table<AreaRegionTreeSummary>
              columns={treeColumns}
              dataSource={tree}
              loading={loading}
              pagination={false}
              rowKey="code"
              scroll={{ x: 'max-content', y: 520 }}
              virtual
            />
          </Card>
          <Card
            title={formatMessage(
              'pages.system.area.cards.regionQuery',
              '地区查询结果',
            )}
          >
            <Table<AreaRegionSummary>
              columns={regionColumns}
              dataSource={regions}
              loading={searching || loading}
              locale={{
                emptyText: (
                  <Empty
                    description={formatMessage(
                      'pages.system.area.empty.regions',
                      '没有匹配的地区。',
                    )}
                  />
                ),
              }}
              pagination={{ pageSize: 20, showSizeChanger: true }}
              rowKey="code"
              scroll={{ x: 'max-content' }}
            />
          </Card>
        </Space>
      ),
    },
    {
      key: 'ip',
      label: formatMessage('pages.system.area.tabs.ip', 'IP 查询'),
      children: (
        <Card
          title={formatMessage(
            'pages.system.area.cards.ipBoundaryLookup',
            'IP 边界查询',
          )}
        >
          <Form
            form={lookupForm}
            layout="inline"
            onFinish={(values) => void lookupIp(values)}
            style={{ marginBottom: 16, rowGap: 12 }}
          >
            <Form.Item
              name="ip"
              rules={[
                {
                  required: true,
                  message: formatMessage(
                    'pages.system.area.validation.ipRequired',
                    '请输入 IP。',
                  ),
                },
              ]}
            >
              <Input placeholder="203.0.113.7" style={{ width: 220 }} />
            </Form.Item>
            <Form.Item>
              <Button
                htmlType="submit"
                icon={<SearchOutlined />}
                loading={lookupLoading}
                type="primary"
              >
                {formatMessage(
                  'pages.system.area.actions.lookupIpBoundary',
                  '查询 IP 边界',
                )}
              </Button>
            </Form.Item>
          </Form>
          {lookupResult ? (
            <Descriptions bordered column={{ md: 2, xs: 1 }} size="small">
              <Descriptions.Item
                label={formatMessage(
                  'pages.system.area.fields.normalizedIp',
                  '规范化 IP',
                )}
              >
                {lookupResult.normalizedIp}
              </Descriptions.Item>
              <Descriptions.Item
                label={formatMessage(
                  'pages.system.area.fields.networkType',
                  '网络类型',
                )}
              >
                {lookupResult.networkType}
              </Descriptions.Item>
              <Descriptions.Item
                label={formatMessage(
                  'pages.system.area.fields.location',
                  '位置',
                )}
              >
                {lookupResult.location}
              </Descriptions.Item>
              <Descriptions.Item
                label={formatMessage(
                  'pages.system.area.fields.matchedRegion',
                  '命中地区',
                )}
              >
                {lookupResult.region
                  ? `${lookupResult.region.name} (${lookupResult.region.code})`
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item
                label={formatMessage(
                  'pages.system.area.fields.matchedRange',
                  '命中网段',
                )}
              >
                {lookupResult.range?.cidr ?? '-'}
              </Descriptions.Item>
            </Descriptions>
          ) : null}
        </Card>
      ),
    },
    {
      key: 'versions',
      label: formatMessage('pages.system.area.tabs.versions', '数据集治理'),
      children: (
        <Card
          title={formatMessage(
            'pages.system.area.cards.datasetVersions',
            '地区数据集版本',
          )}
        >
          <Table<AreaDatasetVersionSummary>
            columns={versionColumns}
            dataSource={versions}
            loading={loading}
            pagination={false}
            rowKey="version"
            scroll={{ x: 'max-content' }}
          />
        </Card>
      ),
    },
    {
      key: 'import',
      label: formatMessage('pages.system.area.tabs.import', '数据导入'),
      children: (
        <Card
          title={formatMessage(
            'pages.system.area.cards.datasetImport',
            '地区数据集导入',
          )}
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Alert
              message={`${formatMessage(
                'pages.system.area.permission.importRequired',
                '需要 system:area:import 权限',
              )}；${formatMessage(
                'pages.system.area.permission.manageRequired',
                '激活版本需要 system:area:manage 权限',
              )}`}
              showIcon
              type={canImportAreaData ? 'info' : 'warning'}
            />
            <Form form={importForm} layout="vertical">
              <Form.Item
                label={formatMessage(
                  'pages.system.area.fields.datasetJson',
                  '数据集 JSON',
                )}
                name="datasetJson"
                rules={[
                  {
                    required: true,
                    message: formatMessage(
                      'pages.system.area.validation.datasetJsonRequired',
                      '请输入数据集 JSON。',
                    ),
                  },
                ]}
              >
                <Input.TextArea rows={14} />
              </Form.Item>
              <Space wrap>
                <Button
                  disabled={!canImportAreaData}
                  icon={<CheckCircleOutlined />}
                  loading={importLoading}
                  onClick={() => void submitImport(true)}
                >
                  {formatMessage(
                    'pages.system.area.actions.validateImport',
                    '校验地区导入',
                  )}
                </Button>
                <Button
                  disabled={!canImportAreaData}
                  icon={<CloudUploadOutlined />}
                  loading={importLoading}
                  onClick={() => void submitImport(false)}
                  type="primary"
                >
                  {formatMessage(
                    'pages.system.area.actions.activateImport',
                    '激活地区导入',
                  )}
                </Button>
              </Space>
            </Form>
            {importResult ? (
              <Descriptions bordered column={{ md: 2, xs: 1 }} size="small">
                <Descriptions.Item
                  label={formatMessage(
                    'pages.system.area.fields.version',
                    '版本',
                  )}
                >
                  {importResult.dataset.version}
                </Descriptions.Item>
                <Descriptions.Item
                  label={formatMessage(
                    'pages.system.area.fields.dryRun',
                    '预演',
                  )}
                >
                  {importResult.dryRun
                    ? formatMessage('pages.system.area.boolean.yes', '是')
                    : formatMessage('pages.system.area.boolean.no', '否')}
                </Descriptions.Item>
                <Descriptions.Item
                  label={formatMessage(
                    'pages.system.area.fields.applied',
                    '已应用',
                  )}
                >
                  {importResult.applied
                    ? formatMessage('pages.system.area.boolean.yes', '是')
                    : formatMessage('pages.system.area.boolean.no', '否')}
                </Descriptions.Item>
                <Descriptions.Item
                  label={formatMessage(
                    'pages.system.area.fields.warnings',
                    '警告',
                  )}
                >
                  {importResult.warnings.length > 0
                    ? importResult.warnings.join('；')
                    : '-'}
                </Descriptions.Item>
              </Descriptions>
            ) : null}
          </Space>
        </Card>
      ),
    },
  ];

  return (
    <PageContainer
      title={formatMessage('pages.system.area.title', '地区管理')}
      subTitle={formatMessage('pages.system.area.section', '系统基础主数据')}
      extra={
        <Space size={[4, 4]} wrap>
          <Tag color="blue">{areaReadPermissionCode}</Tag>
          <Tag color={canImportAreaData ? 'gold' : 'default'}>
            {areaImportPermissionCode}
          </Tag>
          <Tag color={canManageAreaData ? 'purple' : 'default'}>
            {areaManagePermissionCode}
          </Tag>
        </Space>
      }
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {loadError ? (
          <Alert
            message={formatMessage(
              'pages.system.area.load.liveFailure',
              '地区数据实时 API 不可用',
            )}
            description={loadError}
            showIcon
            type="error"
          />
        ) : null}
        <div
          style={{
            display: 'grid',
            gap: 16,
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          }}
        >
          <Card>
            <Statistic
              title={formatMessage(
                'pages.system.area.stats.activeVersion',
                '活跃版本',
              )}
              value={activeVersion?.version ?? '-'}
            />
          </Card>
          <Card>
            <Statistic
              title={formatMessage('pages.system.area.stats.regions', '地区数')}
              value={dataset?.regionCount ?? 0}
            />
          </Card>
          <Card>
            <Statistic
              title={formatMessage('pages.system.area.stats.ipRanges', 'IP 段')}
              value={dataset?.ipRangeCount ?? 0}
            />
          </Card>
          <Card>
            <Statistic
              title={formatMessage(
                'pages.system.area.stats.maxDepth',
                '最大深度',
              )}
              value={dataset?.maxDepth ?? 0}
            />
          </Card>
        </div>
        <Typography.Text type="secondary">
          {formatMessage(
            'pages.system.area.summary',
            '地区管理使用 live API，覆盖地区树、地区查询、IP 边界查询、数据集导入预演与版本激活。',
          )}
        </Typography.Text>
        <Tabs items={tabItems} />
      </Space>
    </PageContainer>
  );
}
