import {
  DiffOutlined,
  FileSearchOutlined,
  ReloadOutlined,
  RollbackOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import { useAccess, useIntl } from '@umijs/max';
import type {
  OpenForgeArtifactSummary,
  OpenForgeDiffEntrySummary,
  OpenForgeDiffSummary,
  OpenForgeDoctorCheckSummary,
  OpenForgeDoctorSummary,
  OpenForgeManifestDetailSummary,
  OpenForgeManifestEntrySummary,
  OpenForgeManifestListEntrySummary,
  OpenForgeManifestListSummary,
  OpenForgePlanSummary,
  OpenForgePreflightSummary,
  OpenForgeStatusSummary,
} from '@opencore/sdk';
import {
  Alert,
  Button,
  Descriptions,
  Input,
  Modal,
  Space,
  Statistic,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createOpenCoreOpenForgeApplyDryRun,
  createOpenCoreOpenForgeDiff,
  createOpenCoreOpenForgeManifestPreview,
  createOpenCoreOpenForgePlan,
  createOpenCoreOpenForgePreflight,
  createOpenCoreOpenForgeRollbackDryRun,
  getOpenCoreOpenForgeManifest,
  getOpenCoreOpenForgeDoctor,
  getOpenCoreOpenForgeStatus,
  listOpenCoreOpenForgeManifests,
} from '@/services/opencore/platform';

const DEFAULT_SCHEMA_PATH = 'tools/generator/examples/core.dict.v1.schema.json';
const DEFAULT_CONFIG_PATH = 'tools/generator/examples/openforge.v1.config.json';

type FormatMessage = (
  id: string,
  defaultMessage: string,
  values?: Record<string, number | string>,
) => string;

function createArtifactColumns(
  formatMessage: FormatMessage,
  booleanLabels: { readonly no: string; readonly yes: string },
): ProColumns<OpenForgeArtifactSummary>[] {
  return [
    {
      title: formatMessage('pages.tools.openforge.fields.kind', 'Kind'),
      dataIndex: 'kind',
      width: 180,
    },
    {
      title: formatMessage(
        'pages.tools.openforge.fields.targetPath',
        'Target path',
      ),
      dataIndex: 'targetPath',
    },
    {
      title: formatMessage('pages.tools.openforge.fields.action', 'Action'),
      dataIndex: 'action',
      width: 140,
      render: (_, record) => <Tag>{record.action}</Tag>,
    },
    {
      title: formatMessage(
        'pages.tools.openforge.fields.protected',
        'Protected',
      ),
      dataIndex: 'protected',
      width: 120,
      render: (_, record) => (
        <Tag color={record.protected ? 'red' : 'green'}>
          {record.protected ? booleanLabels.yes : booleanLabels.no}
        </Tag>
      ),
    },
  ];
}

function createDiffColumns(
  formatMessage: FormatMessage,
): ProColumns<OpenForgeDiffEntrySummary>[] {
  return [
    {
      title: formatMessage('pages.tools.openforge.fields.kind', 'Kind'),
      dataIndex: 'kind',
      width: 180,
    },
    {
      title: formatMessage(
        'pages.tools.openforge.fields.targetPath',
        'Target path',
      ),
      dataIndex: 'targetPath',
    },
    {
      title: formatMessage('pages.tools.openforge.fields.status', 'Status'),
      dataIndex: 'status',
      width: 180,
      render: (_, record) => (
        <Tag color={record.protected ? 'red' : 'blue'}>{record.status}</Tag>
      ),
    },
    {
      title: formatMessage('pages.tools.openforge.fields.reason', 'Reason'),
      dataIndex: 'reason',
    },
  ];
}

function createDoctorColumns(
  formatMessage: FormatMessage,
): ProColumns<OpenForgeDoctorCheckSummary>[] {
  return [
    {
      title: formatMessage('pages.tools.openforge.fields.check', 'Check'),
      dataIndex: 'label',
      width: 220,
    },
    {
      title: formatMessage('pages.tools.openforge.fields.status', 'Status'),
      dataIndex: 'status',
      width: 120,
      render: (_, record) => (
        <Tag color={record.status === 'pass' ? 'green' : 'red'}>
          {record.status}
        </Tag>
      ),
    },
    {
      title: formatMessage('pages.tools.openforge.fields.message', 'Message'),
      dataIndex: 'message',
    },
  ];
}

function createManifestColumns(
  formatMessage: FormatMessage,
): ProColumns<OpenForgeManifestListEntrySummary>[] {
  return [
    {
      title: formatMessage('pages.tools.openforge.fields.manifest', 'Manifest'),
      dataIndex: 'id',
    },
    {
      title: formatMessage('pages.tools.openforge.fields.module', 'Module'),
      dataIndex: 'moduleCode',
      width: 140,
    },
    {
      title: formatMessage('pages.tools.openforge.fields.entries', 'Entries'),
      dataIndex: 'entryCount',
      width: 120,
    },
    {
      title: formatMessage(
        'pages.tools.openforge.fields.createdAt',
        'Created at',
      ),
      dataIndex: 'createdAt',
      width: 220,
    },
  ];
}

function createManifestEntryColumns(
  formatMessage: FormatMessage,
): ProColumns<OpenForgeManifestEntrySummary>[] {
  return [
    {
      title: formatMessage('pages.tools.openforge.fields.kind', 'Kind'),
      dataIndex: 'artifactKind',
      width: 180,
    },
    {
      title: formatMessage(
        'pages.tools.openforge.fields.targetPath',
        'Target path',
      ),
      dataIndex: 'targetPath',
    },
    {
      title: formatMessage('pages.tools.openforge.fields.action', 'Action'),
      dataIndex: 'action',
      width: 120,
      render: (_, record) => <Tag>{record.action}</Tag>,
    },
    {
      title: formatMessage('pages.tools.openforge.fields.rollback', 'Rollback'),
      dataIndex: 'rollbackAction',
      width: 120,
      render: (_, record) => <Tag>{record.rollbackAction}</Tag>,
    },
  ];
}

function countProtected(plan: OpenForgePlanSummary): number {
  return plan.artifacts.filter((artifact) => artifact.protected).length;
}

function countConflicts(diffEntries: readonly OpenForgeDiffEntrySummary[]) {
  return diffEntries.filter(
    (entry) =>
      entry.status === 'blocked' || entry.status === 'protected-conflict',
  ).length;
}

export default function OpenForgePage() {
  const access = useAccess();
  const intl = useIntl();
  const canManageOpenForge = Boolean(access.canManageOpenForge);
  const [schemaPath, setSchemaPath] = useState(DEFAULT_SCHEMA_PATH);
  const [status, setStatus] = useState<OpenForgeStatusSummary>();
  const [doctor, setDoctor] = useState<OpenForgeDoctorSummary>();
  const [plan, setPlan] = useState<OpenForgePlanSummary>();
  const [diff, setDiff] = useState<OpenForgeDiffSummary>();
  const [preflight, setPreflight] = useState<OpenForgePreflightSummary>();
  const [manifests, setManifests] = useState<OpenForgeManifestListSummary>();
  const [selectedManifestId, setSelectedManifestId] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [dryRunning, setDryRunning] = useState(false);
  const [loadError, setLoadError] = useState<string>();
  const firstManifestId = manifests?.manifests[0]?.id;
  const activeManifestId = selectedManifestId ?? firstManifestId;
  const dryRunConfirmationText = status?.operationPolicy.confirmationText;
  const formatMessage: FormatMessage = useCallback(
    (id, defaultMessage, values) =>
      values
        ? intl.formatMessage({ id, defaultMessage }, values)
        : intl.formatMessage({ id, defaultMessage }),
    [intl],
  );
  const booleanLabels = useMemo(
    () => ({
      no: formatMessage('pages.tools.openforge.boolean.no', 'no'),
      yes: formatMessage('pages.tools.openforge.boolean.yes', 'yes'),
    }),
    [formatMessage],
  );
  const statusLabels = useMemo(
    () => ({
      invalid: formatMessage('pages.tools.openforge.status.invalid', 'invalid'),
      notLoaded: formatMessage(
        'pages.tools.openforge.status.notLoaded',
        'not loaded',
      ),
      valid: formatMessage('pages.tools.openforge.status.valid', 'valid'),
    }),
    [formatMessage],
  );
  const artifactColumns = useMemo(
    () => createArtifactColumns(formatMessage, booleanLabels),
    [booleanLabels, formatMessage],
  );
  const diffColumns = useMemo(
    () => createDiffColumns(formatMessage),
    [formatMessage],
  );
  const doctorColumns = useMemo(
    () => createDoctorColumns(formatMessage),
    [formatMessage],
  );
  const manifestColumns = useMemo(
    () => createManifestColumns(formatMessage),
    [formatMessage],
  );
  const manifestEntryColumns = useMemo(
    () => createManifestEntryColumns(formatMessage),
    [formatMessage],
  );

  const loadWorkbench = async () => {
    setLoading(true);
    try {
      const request = { schemaPath };
      const [
        nextStatus,
        nextDoctor,
        nextPlan,
        nextDiff,
        nextPreflight,
        nextManifests,
      ] = await Promise.all([
        getOpenCoreOpenForgeStatus(),
        getOpenCoreOpenForgeDoctor(),
        createOpenCoreOpenForgePlan(request),
        createOpenCoreOpenForgeDiff(request),
        createOpenCoreOpenForgePreflight(request),
        listOpenCoreOpenForgeManifests(),
      ]);

      setStatus(nextStatus);
      setDoctor(nextDoctor);
      setPlan(nextPlan);
      setDiff(nextDiff);
      setPreflight(nextPreflight);
      setManifests(nextManifests);
      setLoadError(undefined);
    } catch (error: unknown) {
      setStatus(undefined);
      setDoctor(undefined);
      setPlan(undefined);
      setDiff(undefined);
      setPreflight(undefined);
      setManifests(undefined);
      setLoadError(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.tools.openforge.load.failure',
              'Unable to load OpenForge.',
            ),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadWorkbench();
  }, []);

  const showManifestDetail = (
    detail: OpenForgeManifestDetailSummary,
    title: string,
  ) => {
    const manifest = detail.manifest;

    Modal.info({
      title,
      width: 920,
      content: (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Descriptions column={1} size="small">
            <Descriptions.Item
              label={formatMessage(
                'pages.tools.openforge.fields.manifestPath',
                'Manifest path',
              )}
            >
              {detail.manifestPath ||
                formatMessage('pages.tools.openforge.status.dryRun', 'dry-run')}
            </Descriptions.Item>
            <Descriptions.Item
              label={formatMessage(
                'pages.tools.openforge.fields.manifestId',
                'Manifest ID',
              )}
            >
              {manifest?.id ??
                formatMessage(
                  'pages.tools.openforge.status.notAvailable',
                  'not available',
                )}
            </Descriptions.Item>
            <Descriptions.Item
              label={formatMessage(
                'pages.tools.openforge.fields.module',
                'Module',
              )}
            >
              {manifest?.moduleCode ??
                formatMessage(
                  'pages.tools.openforge.status.notAvailable',
                  'not available',
                )}
            </Descriptions.Item>
            <Descriptions.Item
              label={formatMessage(
                'pages.tools.openforge.fields.entries',
                'Entries',
              )}
            >
              {manifest?.entries.length ?? 0}
            </Descriptions.Item>
            <Descriptions.Item
              label={formatMessage(
                'pages.tools.openforge.fields.errors',
                'Errors',
              )}
            >
              {detail.errors.length}
            </Descriptions.Item>
          </Descriptions>
          {manifest ? (
            <ProTable<OpenForgeManifestEntrySummary>
              columns={manifestEntryColumns}
              dataSource={[...manifest.entries]}
              pagination={{ pageSize: 5 }}
              rowKey="targetPath"
              search={false}
              size="small"
              toolBarRender={false}
            />
          ) : null}
        </Space>
      ),
    });
  };

  const runApplyDryRun = () => {
    if (!dryRunConfirmationText) {
      message.error(
        formatMessage(
          'pages.tools.openforge.messages.statusRequiredForApply',
          'OpenForge status must load before dry-run apply.',
        ),
      );
      return;
    }

    Modal.confirm({
      title: formatMessage(
        'pages.tools.openforge.confirm.applyTitle',
        'Confirm OpenForge dry-run apply',
      ),
      okText: formatMessage(
        'pages.tools.openforge.actions.dryRunApply',
        'Dry-run apply',
      ),
      content: formatMessage(
        'pages.tools.openforge.confirm.dryRunRequired',
        'Dry-run confirmation required: {text}',
        { text: dryRunConfirmationText },
      ),
      onOk: async () => {
        setDryRunning(true);
        try {
          const result = await createOpenCoreOpenForgeApplyDryRun({
            schemaPath,
            configPath: DEFAULT_CONFIG_PATH,
            confirmationText: dryRunConfirmationText,
            requestedMode: 'dry-run',
          });
          showManifestDetail(
            {
              manifestPath: result.manifest
                ? `dry-run:${result.manifest.id}`
                : '',
              manifest: result.manifest,
              warnings: result.warnings,
              errors: result.errors,
            },
            formatMessage(
              'pages.tools.openforge.modal.applyManifestTitle',
              'OpenForge dry-run apply manifest',
            ),
          );
        } catch (error: unknown) {
          message.error(
            error instanceof Error
              ? error.message
              : formatMessage(
                  'pages.tools.openforge.apply.failure',
                  'OpenForge dry-run failed.',
                ),
          );
        } finally {
          setDryRunning(false);
        }
      },
    });
  };

  const runManifestPreview = async () => {
    setDryRunning(true);
    try {
      const result = await createOpenCoreOpenForgeManifestPreview({
        schemaPath,
        configPath: DEFAULT_CONFIG_PATH,
      });
      showManifestDetail(
        result,
        formatMessage(
          'pages.tools.openforge.modal.previewTitle',
          'OpenForge manifest preview',
        ),
      );
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.tools.openforge.preview.failure',
              'OpenForge preview failed.',
            ),
      );
    } finally {
      setDryRunning(false);
    }
  };

  const viewManifestDetail = async () => {
    if (!activeManifestId) {
      message.warning(
        formatMessage(
          'pages.tools.openforge.messages.noManifestSelected',
          'No OpenForge manifest selected.',
        ),
      );
      return;
    }

    setDryRunning(true);
    try {
      const result = await getOpenCoreOpenForgeManifest(activeManifestId);
      showManifestDetail(
        result,
        formatMessage(
          'pages.tools.openforge.modal.detailTitle',
          'OpenForge manifest detail',
        ),
      );
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.tools.openforge.detail.failure',
              'OpenForge manifest detail failed.',
            ),
      );
    } finally {
      setDryRunning(false);
    }
  };

  const runRollbackDryRun = () => {
    if (!activeManifestId) {
      message.warning(
        formatMessage(
          'pages.tools.openforge.messages.noManifestSelected',
          'No OpenForge manifest selected.',
        ),
      );
      return;
    }
    if (!dryRunConfirmationText) {
      message.error(
        formatMessage(
          'pages.tools.openforge.messages.statusRequiredForRollback',
          'OpenForge status must load before dry-run rollback.',
        ),
      );
      return;
    }

    Modal.confirm({
      title: formatMessage(
        'pages.tools.openforge.confirm.rollbackTitle',
        'Confirm OpenForge rollback dry-run',
      ),
      okText: formatMessage(
        'pages.tools.openforge.actions.dryRunRollback',
        'Dry-run rollback',
      ),
      content: formatMessage(
        'pages.tools.openforge.confirm.dryRunRequired',
        'Dry-run confirmation required: {text}',
        { text: dryRunConfirmationText },
      ),
      onOk: async () => {
        setDryRunning(true);
        try {
          const result = await createOpenCoreOpenForgeRollbackDryRun({
            confirmationText: dryRunConfirmationText,
            manifestId: activeManifestId,
            requestedMode: 'dry-run',
          });
          showManifestDetail(
            {
              manifestPath: result.manifest
                ? `.openforge/manifests/${result.manifest.id}.json`
                : '',
              manifest: result.manifest,
              warnings: result.warnings,
              errors: result.errors,
            },
            formatMessage(
              'pages.tools.openforge.modal.rollbackManifestTitle',
              'OpenForge rollback dry-run manifest',
            ),
          );
        } catch (error: unknown) {
          message.error(
            error instanceof Error
              ? error.message
              : formatMessage(
                  'pages.tools.openforge.rollback.failure',
                  'OpenForge rollback failed.',
                ),
          );
        } finally {
          setDryRunning(false);
        }
      },
    });
  };

  const summaryStats = useMemo(
    () => [
      {
        title: formatMessage(
          'pages.tools.openforge.stats.artifacts',
          'Artifacts',
        ),
        value: plan?.artifacts.length ?? 0,
      },
      {
        title: formatMessage(
          'pages.tools.openforge.stats.protected',
          'Protected',
        ),
        value: plan ? countProtected(plan) : 0,
      },
      {
        title: formatMessage(
          'pages.tools.openforge.stats.diffConflicts',
          'Diff conflicts',
        ),
        value: diff ? countConflicts(diff.entries) : 0,
      },
      {
        title: formatMessage(
          'pages.tools.openforge.stats.doctorChecks',
          'Doctor checks',
        ),
        value: doctor?.checks.length ?? 0,
      },
    ],
    [diff, doctor, formatMessage, plan],
  );

  return (
    <PageContainer
      title={formatMessage('pages.tools.openforge.title', 'OpenForge')}
      subTitle={formatMessage(
        'pages.tools.openforge.section',
        'Safe generator workbench',
      )}
      extra={[
        <Tooltip
          key="reload"
          title={formatMessage(
            'pages.tools.openforge.actions.reload',
            'Reload',
          )}
        >
          <Button
            icon={<ReloadOutlined />}
            onClick={() => void loadWorkbench()}
          />
        </Tooltip>,
      ]}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {loadError ? (
          <Alert
            message={formatMessage(
              'pages.tools.openforge.load.liveFailure',
              'OpenForge live API unavailable',
            )}
            description={loadError}
            type="warning"
            showIcon
          />
        ) : undefined}

        <Descriptions bordered column={2} size="small">
          <Descriptions.Item
            label={formatMessage(
              'pages.tools.openforge.fields.workspace',
              'Workspace',
            )}
          >
            {status?.workspace.projectName ?? statusLabels.notLoaded}
          </Descriptions.Item>
          <Descriptions.Item
            label={formatMessage(
              'pages.tools.openforge.fields.template',
              'Template',
            )}
          >
            {status?.generatorCore.templateVersion ?? statusLabels.notLoaded}
          </Descriptions.Item>
          <Descriptions.Item
            label={formatMessage(
              'pages.tools.openforge.fields.noWrite',
              'No write',
            )}
          >
            <Tag color={status?.workspace.noWrite ? 'green' : 'default'}>
              {status
                ? status.workspace.noWrite
                  ? booleanLabels.yes
                  : booleanLabels.no
                : statusLabels.notLoaded}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item
            label={formatMessage(
              'pages.tools.openforge.fields.dryRunConfirmation',
              'Dry-run confirmation',
            )}
          >
            {dryRunConfirmationText ?? statusLabels.notLoaded}
          </Descriptions.Item>
          <Descriptions.Item
            label={formatMessage(
              'pages.tools.openforge.fields.preflight',
              'Preflight',
            )}
          >
            <Tag
              color={
                preflight ? (preflight.valid ? 'green' : 'red') : 'default'
              }
            >
              {preflight
                ? preflight.valid
                  ? statusLabels.valid
                  : statusLabels.invalid
                : statusLabels.notLoaded}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item
            label={formatMessage(
              'pages.tools.openforge.fields.schema',
              'Schema',
            )}
            span={2}
          >
            <Input.Search
              enterButton={formatMessage(
                'pages.tools.openforge.actions.refresh',
                'Refresh',
              )}
              value={schemaPath}
              onChange={(event) => setSchemaPath(event.target.value)}
              onSearch={() => void loadWorkbench()}
            />
          </Descriptions.Item>
        </Descriptions>

        <Space wrap>
          {summaryStats.map((stat) => (
            <Statistic key={stat.title} title={stat.title} value={stat.value} />
          ))}
        </Space>

        <Space wrap>
          <Tooltip
            title={formatMessage(
              'pages.tools.openforge.permission.manageRequired',
              'Requires tool:openforge:manage',
            )}
          >
            <Button
              icon={<ThunderboltOutlined />}
              loading={dryRunning}
              disabled={!canManageOpenForge || !dryRunConfirmationText}
              onClick={runApplyDryRun}
            >
              {formatMessage(
                'pages.tools.openforge.actions.dryRunApply',
                'Dry-run apply',
              )}
            </Button>
          </Tooltip>
          <Tooltip
            title={formatMessage(
              'pages.tools.openforge.actions.manifestPreview',
              'Manifest preview',
            )}
          >
            <Button
              icon={<FileSearchOutlined />}
              loading={dryRunning}
              onClick={() => void runManifestPreview()}
            >
              {formatMessage(
                'pages.tools.openforge.actions.manifestPreview',
                'Manifest preview',
              )}
            </Button>
          </Tooltip>
          <Tooltip
            title={formatMessage(
              'pages.tools.openforge.actions.manifestDetail',
              'Manifest detail',
            )}
          >
            <Button
              icon={<FileSearchOutlined />}
              loading={dryRunning}
              disabled={!activeManifestId}
              onClick={() => void viewManifestDetail()}
            >
              {formatMessage(
                'pages.tools.openforge.actions.manifestDetail',
                'Manifest detail',
              )}
            </Button>
          </Tooltip>
          <Tooltip
            title={formatMessage(
              'pages.tools.openforge.permission.manageRequired',
              'Requires tool:openforge:manage',
            )}
          >
            <Button
              icon={<RollbackOutlined />}
              loading={dryRunning}
              disabled={
                !canManageOpenForge ||
                !activeManifestId ||
                !dryRunConfirmationText
              }
              onClick={runRollbackDryRun}
            >
              {formatMessage(
                'pages.tools.openforge.actions.dryRunRollback',
                'Dry-run rollback',
              )}
            </Button>
          </Tooltip>
          <Tag icon={<SafetyCertificateOutlined />}>tool:openforge:manage</Tag>
          <Tag icon={<FileSearchOutlined />}>
            {preflight?.schemaPath ??
              formatMessage(
                'pages.tools.openforge.status.schemaNotLoaded',
                'schema not loaded',
              )}
          </Tag>
          <Tag icon={<DiffOutlined />}>
            {plan?.moduleCode ??
              formatMessage(
                'pages.tools.openforge.status.moduleNotLoaded',
                'module not loaded',
              )}
          </Tag>
        </Space>

        <ProTable<OpenForgeArtifactSummary>
          columns={artifactColumns}
          dataSource={plan ? [...plan.artifacts] : []}
          loading={loading}
          pagination={{ pageSize: 8 }}
          rowKey="targetPath"
          search={false}
          size="small"
          toolBarRender={false}
          headerTitle={formatMessage(
            'pages.tools.openforge.tables.planArtifacts',
            'Plan artifacts',
          )}
        />

        <ProTable<OpenForgeDiffEntrySummary>
          columns={diffColumns}
          dataSource={diff ? [...diff.entries] : []}
          loading={loading}
          pagination={{ pageSize: 8 }}
          rowKey="targetPath"
          search={false}
          size="small"
          toolBarRender={false}
          headerTitle={formatMessage(
            'pages.tools.openforge.tables.diffPlan',
            'Diff plan',
          )}
        />

        <ProTable<OpenForgeDoctorCheckSummary>
          columns={doctorColumns}
          dataSource={doctor ? [...doctor.checks] : []}
          loading={loading}
          pagination={{ pageSize: 8 }}
          rowKey="id"
          search={false}
          size="small"
          toolBarRender={false}
          headerTitle={formatMessage(
            'pages.tools.openforge.tables.doctorChecks',
            'Doctor checks',
          )}
        />

        <ProTable<OpenForgeManifestListEntrySummary>
          columns={manifestColumns}
          dataSource={manifests ? [...manifests.manifests] : []}
          loading={loading}
          pagination={{ pageSize: 8 }}
          rowKey="id"
          search={false}
          size="small"
          toolBarRender={false}
          headerTitle={formatMessage(
            'pages.tools.openforge.tables.manifests',
            'OpenForge manifests',
          )}
          rowSelection={{
            type: 'radio',
            selectedRowKeys: activeManifestId ? [activeManifestId] : [],
            onChange: (keys) => setSelectedManifestId(String(keys[0])),
          }}
        />

        <Typography.Paragraph type="secondary">
          {formatMessage(
            'pages.tools.openforge.policy.dryRunGuard',
            'Dry-run apply is guarded by live OpenForge confirmation; write apply remains outside the admitted OpenForge surface.',
          )}
        </Typography.Paragraph>
      </Space>
    </PageContainer>
  );
}
