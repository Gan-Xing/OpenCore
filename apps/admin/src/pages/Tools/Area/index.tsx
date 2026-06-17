import {
  CheckCircleOutlined,
  CloudUploadOutlined,
  ReloadOutlined,
  SearchOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import { useAccess, useIntl } from '@umijs/max';
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
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  activateOpenCoreAreaDatasetVersion,
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

type FormatMessage = (
  id: string,
  defaultMessage: string,
  values?: Record<string, number | string>,
) => string;

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
const areaReadPermissionCode = 'tool:area:read';
const areaImportPermissionCode = 'tool:area:import';

function createRegionColumns(
  formatMessage: FormatMessage,
): ProColumns<AreaRegionSummary>[] {
  return [
    {
      title: formatMessage('pages.tools.area.fields.code', 'Code'),
      dataIndex: 'code',
      width: 160,
    },
    {
      title: formatMessage('pages.tools.area.fields.name', 'Name'),
      dataIndex: 'name',
    },
    {
      title: formatMessage('pages.tools.area.fields.parent', 'Parent'),
      dataIndex: 'parentCode',
      render: (_, record) => record.parentCode ?? '-',
    },
    {
      title: formatMessage('pages.tools.area.fields.level', 'Level'),
      dataIndex: 'level',
      width: 90,
    },
    {
      title: formatMessage('pages.tools.area.fields.path', 'Path'),
      dataIndex: 'path',
      render: (_, record) => record.path.join(' / '),
    },
    {
      title: formatMessage('pages.tools.area.fields.aliases', 'Aliases'),
      dataIndex: 'aliases',
      render: (_, record) =>
        record.aliases.length > 0
          ? record.aliases.map((alias) => <Tag key={alias}>{alias}</Tag>)
          : '-',
    },
    {
      title: formatMessage('pages.tools.area.fields.ipRanges', 'IP ranges'),
      dataIndex: 'ipRanges',
      render: (_, record) =>
        record.ipRanges.length > 0
          ? record.ipRanges.map((range) => (
              <Tag key={range.cidr}>{range.cidr}</Tag>
            ))
          : '-',
    },
  ];
}

export default function AreaDataPage() {
  const access = useAccess();
  const intl = useIntl();
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
  const [activatingVersion, setActivatingVersion] = useState<string>();
  const [loadError, setLoadError] = useState<string>();
  const formatMessage: FormatMessage = useCallback(
    (id, defaultMessage, values) =>
      values
        ? intl.formatMessage({ id, defaultMessage }, values)
        : intl.formatMessage({ id, defaultMessage }),
    [intl],
  );
  const booleanLabels = useMemo(
    () => ({
      no: formatMessage('pages.tools.area.boolean.no', 'no'),
      yes: formatMessage('pages.tools.area.boolean.yes', 'yes'),
    }),
    [formatMessage],
  );
  const versionStateLabels = useMemo(
    () => ({
      active: formatMessage('pages.tools.area.versionState.active', 'active'),
      stored: formatMessage('pages.tools.area.versionState.stored', 'stored'),
    }),
    [formatMessage],
  );

  const activeVersion = useMemo(
    () => versions.find((version) => version.active),
    [versions],
  );
  const regionColumns = useMemo(
    () => createRegionColumns(formatMessage),
    [formatMessage],
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
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.tools.area.load.failure',
              'Unable to load area data.',
            ),
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
          : formatMessage(
              'pages.tools.area.query.failure',
              'Unable to query area regions.',
            ),
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
          : formatMessage(
              'pages.tools.area.lookup.failure',
              'Unable to lookup IP boundary.',
            ),
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
        dryRun
          ? formatMessage(
              'pages.tools.area.messages.dryRunPassed',
              'Area import dry-run passed.',
            )
          : formatMessage(
              'pages.tools.area.messages.datasetActivated',
              'Area dataset activated.',
            ),
      );
      if (!dryRun) {
        await loadAreaData('');
      }
    } catch (error: unknown) {
      setLoadError(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.tools.area.import.failure',
              'Unable to import area dataset.',
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
      setLoadError(undefined);
      message.success(
        formatMessage(
          'pages.tools.area.messages.versionActivated',
          'Area dataset version activated.',
        ),
      );
      await loadAreaData(regionForm.getFieldValue('query'));
    } catch (error: unknown) {
      setLoadError(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.tools.area.activate.failure',
              'Unable to activate area dataset version.',
            ),
      );
    } finally {
      setActivatingVersion(undefined);
    }
  };

  const versionColumns: ProColumns<AreaDatasetVersionSummary>[] = [
    {
      title: formatMessage('pages.tools.area.fields.version', 'Version'),
      dataIndex: 'version',
    },
    {
      title: formatMessage('pages.tools.area.fields.source', 'Source'),
      dataIndex: 'source',
    },
    {
      title: formatMessage('pages.tools.area.fields.regions', 'Regions'),
      dataIndex: 'regionCount',
      width: 100,
    },
    {
      title: formatMessage('pages.tools.area.fields.ipRanges', 'IP ranges'),
      dataIndex: 'ipRangeCount',
      width: 110,
    },
    {
      title: formatMessage('pages.tools.area.fields.maxDepth', 'Max depth'),
      dataIndex: 'maxDepth',
      width: 110,
    },
    {
      title: formatMessage('pages.tools.area.fields.active', 'Active'),
      dataIndex: 'active',
      width: 90,
      render: (_, record) =>
        record.active ? (
          <Tag color="green">{versionStateLabels.active}</Tag>
        ) : (
          <Tag>{versionStateLabels.stored}</Tag>
        ),
    },
    {
      title: formatMessage('pages.tools.area.fields.importedAt', 'Imported at'),
      dataIndex: 'importedAt',
    },
    {
      title: formatMessage('pages.tools.area.actions.column', 'Action'),
      valueType: 'option',
      width: 120,
      render: (_, record) =>
        record.active ? null : (
          <Tooltip
            title={formatMessage(
              'pages.tools.area.actions.activateTooltip',
              'Activate stored version',
            )}
          >
            <Button
              disabled={!canImportAreaData}
              icon={<SwapOutlined />}
              loading={activatingVersion === record.version}
              onClick={() => void activateVersion(record.version)}
              size="small"
            >
              {formatMessage('pages.tools.area.actions.activate', 'Activate')}
            </Button>
          </Tooltip>
        ),
    },
  ];

  useEffect(() => {
    regionForm.setFieldsValue({ query: 'san' });
    lookupForm.setFieldsValue({ ip: '203.0.113.7' });
    importForm.setFieldsValue({ datasetJson: sampleImportJson });
    void loadAreaData();
  }, [importForm, lookupForm, regionForm]);

  return (
    <PageContainer
      title={formatMessage('pages.tools.area.title', 'Area data boundary')}
      subTitle={formatMessage('pages.tools.area.section', 'Tool Area')}
      extra={[
        <Tooltip
          key="reload"
          title={formatMessage(
            'pages.tools.area.actions.reload',
            'Reload area dataset',
          )}
        >
          <Button
            aria-label={formatMessage(
              'pages.tools.area.actions.reloadAria',
              'Reload area dataset',
            )}
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
          message={formatMessage(
            'pages.tools.area.load.liveFailure',
            'Area data live API unavailable',
          )}
          description={loadError}
          style={{ marginBlockEnd: 16 }}
        />
      ) : null}

      <Space size="large" style={{ marginBottom: 16 }} wrap>
        <Statistic
          title={formatMessage(
            'pages.tools.area.stats.activeVersion',
            'Active version',
          )}
          value={dataset?.version ?? '-'}
        />
        <Statistic
          title={formatMessage('pages.tools.area.stats.regions', 'Regions')}
          value={dataset?.regionCount ?? 0}
        />
        <Statistic
          title={formatMessage('pages.tools.area.stats.ipRanges', 'IP ranges')}
          value={dataset?.ipRangeCount ?? 0}
        />
        <Statistic
          title={formatMessage('pages.tools.area.stats.maxDepth', 'Max depth')}
          value={dataset?.maxDepth ?? 0}
        />
        <Tag color={activeVersion ? 'green' : 'blue'}>
          {areaReadPermissionCode}
        </Tag>
        <Tag color={canImportAreaData ? 'gold' : 'default'}>
          {areaImportPermissionCode}
        </Tag>
      </Space>

      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Card
          title={formatMessage(
            'pages.tools.area.cards.datasetVersions',
            'Area dataset versions',
          )}
        >
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

        <Card
          title={formatMessage(
            'pages.tools.area.cards.regionQuery',
            'Area region query',
          )}
        >
          <Form<RegionSearchValues>
            form={regionForm}
            layout="inline"
            onFinish={(values) => void searchRegions(values)}
            style={{ marginBottom: 16 }}
          >
            <Form.Item name="query">
              <Input
                allowClear
                placeholder={formatMessage(
                  'pages.tools.area.search.placeholder',
                  'Search code, name, alias, path',
                )}
              />
            </Form.Item>
            <Button
              htmlType="submit"
              icon={<SearchOutlined />}
              loading={searching}
              type="primary"
            >
              {formatMessage(
                'pages.tools.area.actions.searchRegions',
                'Search regions',
              )}
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

        <Card
          title={formatMessage(
            'pages.tools.area.cards.ipBoundaryLookup',
            'IP boundary lookup',
          )}
        >
          <Form<IpLookupValues>
            form={lookupForm}
            layout="inline"
            onFinish={(values) => void lookupIp(values)}
            style={{ marginBottom: 16 }}
          >
            <Form.Item
              name="ip"
              rules={[
                {
                  required: true,
                  message: formatMessage(
                    'pages.tools.area.validation.ipRequired',
                    'IP is required.',
                  ),
                },
              ]}
            >
              <Input placeholder="203.0.113.7" />
            </Form.Item>
            <Button
              htmlType="submit"
              icon={<SearchOutlined />}
              loading={lookupLoading}
              type="primary"
            >
              {formatMessage(
                'pages.tools.area.actions.lookupIpBoundary',
                'Lookup IP boundary',
              )}
            </Button>
          </Form>
          <Descriptions bordered column={1}>
            <Descriptions.Item
              label={formatMessage(
                'pages.tools.area.fields.normalizedIp',
                'Normalized IP',
              )}
            >
              {lookupResult?.normalizedIp ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item
              label={formatMessage(
                'pages.tools.area.fields.networkType',
                'Network type',
              )}
            >
              {lookupResult?.networkType ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item
              label={formatMessage(
                'pages.tools.area.fields.location',
                'Location',
              )}
            >
              {lookupResult?.location ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item
              label={formatMessage(
                'pages.tools.area.fields.matchedRegion',
                'Matched region',
              )}
            >
              {lookupResult?.region ? (
                <Space>
                  <Tag color="green">{lookupResult.region.code}</Tag>
                  <Typography.Text>{lookupResult.region.name}</Typography.Text>
                </Space>
              ) : (
                '-'
              )}
            </Descriptions.Item>
            <Descriptions.Item
              label={formatMessage(
                'pages.tools.area.fields.matchedRange',
                'Matched range',
              )}
            >
              {lookupResult?.range?.cidr ?? '-'}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card
          title={formatMessage(
            'pages.tools.area.cards.datasetImport',
            'Area dataset import',
          )}
        >
          <Form<ImportValues> form={importForm} layout="vertical">
            <Form.Item
              label={formatMessage(
                'pages.tools.area.fields.datasetJson',
                'Dataset JSON',
              )}
              name="datasetJson"
              rules={[
                {
                  required: true,
                  message: formatMessage(
                    'pages.tools.area.validation.datasetJsonRequired',
                    'Dataset JSON is required.',
                  ),
                },
              ]}
            >
              <Input.TextArea rows={10} />
            </Form.Item>
            <Space wrap>
              <Button
                icon={<CheckCircleOutlined />}
                loading={importLoading}
                onClick={() => void importDataset(true)}
              >
                {formatMessage(
                  'pages.tools.area.actions.validateImport',
                  'Validate area import',
                )}
              </Button>
              <Tooltip
                title={formatMessage(
                  'pages.tools.area.permission.importRequired',
                  'Requires tool:area:import',
                )}
              >
                <Button
                  disabled={!canImportAreaData}
                  icon={<CloudUploadOutlined />}
                  loading={importLoading}
                  onClick={() => void importDataset(false)}
                  type="primary"
                >
                  {formatMessage(
                    'pages.tools.area.actions.activateImport',
                    'Activate area import',
                  )}
                </Button>
              </Tooltip>
            </Space>
          </Form>
          {importResult ? (
            <Descriptions bordered column={1} style={{ marginTop: 16 }}>
              <Descriptions.Item
                label={formatMessage(
                  'pages.tools.area.fields.dryRun',
                  'Dry run',
                )}
              >
                {importResult.dryRun ? booleanLabels.yes : booleanLabels.no}
              </Descriptions.Item>
              <Descriptions.Item
                label={formatMessage(
                  'pages.tools.area.fields.applied',
                  'Applied',
                )}
              >
                {importResult.applied ? booleanLabels.yes : booleanLabels.no}
              </Descriptions.Item>
              <Descriptions.Item
                label={formatMessage(
                  'pages.tools.area.fields.version',
                  'Version',
                )}
              >
                {importResult.dataset.version}
              </Descriptions.Item>
              <Descriptions.Item
                label={formatMessage(
                  'pages.tools.area.fields.checksum',
                  'Checksum',
                )}
              >
                <Typography.Text copyable>
                  {importResult.dataset.checksum}
                </Typography.Text>
              </Descriptions.Item>
              <Descriptions.Item
                label={formatMessage(
                  'pages.tools.area.fields.warnings',
                  'Warnings',
                )}
              >
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
