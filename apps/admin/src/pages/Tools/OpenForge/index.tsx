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
import { useAccess } from '@umijs/max';
import {
  createOpenForgeApplyDryRunFixture,
  createOpenForgeDiffFixture,
  createOpenForgeDoctorFixture,
  createOpenForgeManifestListFixture,
  createOpenForgePlanFixture,
  createOpenForgePreflightFixture,
  createOpenForgeStatusFixture,
  type OpenForgeArtifactSummary,
  type OpenForgeDiffEntrySummary,
  type OpenForgeDoctorCheckSummary,
  type OpenForgeManifestListEntrySummary,
  type OpenForgeManifestListSummary,
  type OpenForgePlanSummary,
  type OpenForgePreflightSummary,
  type OpenForgeStatusSummary,
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
import { useEffect, useMemo, useState } from 'react';
import {
  createOpenCoreOpenForgeApplyDryRun,
  createOpenCoreOpenForgeDiff,
  createOpenCoreOpenForgePlan,
  createOpenCoreOpenForgePreflight,
  createOpenCoreOpenForgeRollbackDryRun,
  getOpenCoreOpenForgeDoctor,
  getOpenCoreOpenForgeStatus,
  listOpenCoreOpenForgeManifests,
} from '@/services/opencore/platform';

const DEFAULT_SCHEMA_PATH = 'tools/generator/examples/core.dict.v1.schema.json';
const DEFAULT_CONFIG_PATH = 'tools/generator/examples/openforge.v1.config.json';

const fallbackStatus = createOpenForgeStatusFixture();
const fallbackDoctor = createOpenForgeDoctorFixture();
const fallbackPlan = createOpenForgePlanFixture();
const fallbackDiff = createOpenForgeDiffFixture();
const fallbackPreflight = createOpenForgePreflightFixture();
const fallbackApplyDryRun = createOpenForgeApplyDryRunFixture();
const fallbackManifests = createOpenForgeManifestListFixture();

const artifactColumns: ProColumns<OpenForgeArtifactSummary>[] = [
  { title: 'Kind', dataIndex: 'kind', width: 180 },
  { title: 'Target path', dataIndex: 'targetPath' },
  {
    title: 'Action',
    dataIndex: 'action',
    width: 140,
    render: (_, record) => <Tag>{record.action}</Tag>,
  },
  {
    title: 'Protected',
    dataIndex: 'protected',
    width: 120,
    render: (_, record) => (
      <Tag color={record.protected ? 'red' : 'green'}>
        {record.protected ? 'yes' : 'no'}
      </Tag>
    ),
  },
];

const diffColumns: ProColumns<OpenForgeDiffEntrySummary>[] = [
  { title: 'Kind', dataIndex: 'kind', width: 180 },
  { title: 'Target path', dataIndex: 'targetPath' },
  {
    title: 'Status',
    dataIndex: 'status',
    width: 180,
    render: (_, record) => (
      <Tag color={record.protected ? 'red' : 'blue'}>{record.status}</Tag>
    ),
  },
  { title: 'Reason', dataIndex: 'reason' },
];

const doctorColumns: ProColumns<OpenForgeDoctorCheckSummary>[] = [
  { title: 'Check', dataIndex: 'label', width: 220 },
  {
    title: 'Status',
    dataIndex: 'status',
    width: 120,
    render: (_, record) => (
      <Tag color={record.status === 'pass' ? 'green' : 'red'}>
        {record.status}
      </Tag>
    ),
  },
  { title: 'Message', dataIndex: 'message' },
];

const manifestColumns: ProColumns<OpenForgeManifestListEntrySummary>[] = [
  { title: 'Manifest', dataIndex: 'id' },
  { title: 'Module', dataIndex: 'moduleCode', width: 140 },
  { title: 'Entries', dataIndex: 'entryCount', width: 120 },
  { title: 'Created at', dataIndex: 'createdAt', width: 220 },
];

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
  const canManageOpenForge = Boolean(access.canManageOpenForge);
  const [schemaPath, setSchemaPath] = useState(DEFAULT_SCHEMA_PATH);
  const [status, setStatus] = useState<OpenForgeStatusSummary>(fallbackStatus);
  const [doctor, setDoctor] = useState(fallbackDoctor);
  const [plan, setPlan] = useState<OpenForgePlanSummary>(fallbackPlan);
  const [diff, setDiff] = useState(fallbackDiff);
  const [preflight, setPreflight] =
    useState<OpenForgePreflightSummary>(fallbackPreflight);
  const [manifests, setManifests] =
    useState<OpenForgeManifestListSummary>(fallbackManifests);
  const [selectedManifestId, setSelectedManifestId] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [dryRunning, setDryRunning] = useState(false);
  const [loadError, setLoadError] = useState<string>();
  const firstManifestId = manifests.manifests[0]?.id;
  const activeManifestId = selectedManifestId ?? firstManifestId;

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
      setStatus(fallbackStatus);
      setDoctor(fallbackDoctor);
      setPlan(fallbackPlan);
      setDiff(fallbackDiff);
      setPreflight(fallbackPreflight);
      setManifests(fallbackManifests);
      setLoadError(
        error instanceof Error ? error.message : 'Unable to load OpenForge.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadWorkbench();
  }, []);

  const runApplyDryRun = async () => {
    setDryRunning(true);
    try {
      const result = await createOpenCoreOpenForgeApplyDryRun({
        schemaPath,
        configPath: DEFAULT_CONFIG_PATH,
      });
      Modal.info({
        title: 'OpenForge dry-run apply',
        content: (
          <Descriptions column={1} size="small">
            <Descriptions.Item label="Mode">{result.mode}</Descriptions.Item>
            <Descriptions.Item label="Applied">
              {String(result.applied)}
            </Descriptions.Item>
            <Descriptions.Item label="Entries">
              {result.entries.length}
            </Descriptions.Item>
            <Descriptions.Item label="Errors">
              {result.errors.length}
            </Descriptions.Item>
          </Descriptions>
        ),
      });
    } catch (error: unknown) {
      message.error(
        error instanceof Error ? error.message : 'OpenForge dry-run failed.',
      );
    } finally {
      setDryRunning(false);
    }
  };

  const runRollbackDryRun = async () => {
    if (!activeManifestId) {
      message.warning('No OpenForge manifest selected.');
      return;
    }

    setDryRunning(true);
    try {
      const result = await createOpenCoreOpenForgeRollbackDryRun({
        manifestId: activeManifestId,
      });
      Modal.info({
        title: 'OpenForge rollback dry-run',
        content: (
          <Descriptions column={1} size="small">
            <Descriptions.Item label="Mode">{result.mode}</Descriptions.Item>
            <Descriptions.Item label="Rolled back">
              {String(result.rolledBack)}
            </Descriptions.Item>
            <Descriptions.Item label="Entries">
              {result.entries.length}
            </Descriptions.Item>
            <Descriptions.Item label="Errors">
              {result.errors.length}
            </Descriptions.Item>
          </Descriptions>
        ),
      });
    } catch (error: unknown) {
      message.error(
        error instanceof Error ? error.message : 'OpenForge rollback failed.',
      );
    } finally {
      setDryRunning(false);
    }
  };

  const summaryStats = useMemo(
    () => [
      {
        title: 'Artifacts',
        value: plan.artifacts.length,
      },
      {
        title: 'Protected',
        value: countProtected(plan),
      },
      {
        title: 'Diff conflicts',
        value: countConflicts(diff.entries),
      },
      {
        title: 'Doctor checks',
        value: doctor.checks.length,
      },
    ],
    [diff.entries, doctor.checks.length, plan],
  );

  return (
    <PageContainer
      title="OpenForge"
      subTitle="Safe generator workbench"
      extra={[
        <Tooltip key="reload" title="Reload">
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
            message="OpenForge live API unavailable"
            description={loadError}
            type="warning"
            showIcon
          />
        ) : undefined}

        <Descriptions bordered column={2} size="small">
          <Descriptions.Item label="Workspace">
            {status.workspace.projectName}
          </Descriptions.Item>
          <Descriptions.Item label="Template">
            {status.generatorCore.templateVersion}
          </Descriptions.Item>
          <Descriptions.Item label="No write">
            <Tag color={status.workspace.noWrite ? 'green' : 'red'}>
              {String(status.workspace.noWrite)}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Preflight">
            <Tag color={preflight.valid ? 'green' : 'red'}>
              {preflight.valid ? 'valid' : 'invalid'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Schema" span={2}>
            <Input.Search
              enterButton="Refresh"
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
          <Tooltip title="Requires tool:openforge:manage">
            <Button
              icon={<ThunderboltOutlined />}
              loading={dryRunning}
              disabled={!canManageOpenForge}
              onClick={runApplyDryRun}
            >
              Dry-run apply
            </Button>
          </Tooltip>
          <Tooltip title="Requires tool:openforge:manage">
            <Button
              icon={<RollbackOutlined />}
              loading={dryRunning}
              disabled={!canManageOpenForge || !activeManifestId}
              onClick={runRollbackDryRun}
            >
              Dry-run rollback
            </Button>
          </Tooltip>
          <Tag icon={<SafetyCertificateOutlined />}>tool:openforge:manage</Tag>
          <Tag icon={<FileSearchOutlined />}>{preflight.schemaPath}</Tag>
          <Tag icon={<DiffOutlined />}>{plan.moduleCode}</Tag>
        </Space>

        <ProTable<OpenForgeArtifactSummary>
          columns={artifactColumns}
          dataSource={[...plan.artifacts]}
          loading={loading}
          pagination={{ pageSize: 8 }}
          rowKey="targetPath"
          search={false}
          size="small"
          toolBarRender={false}
          headerTitle="Plan artifacts"
        />

        <ProTable<OpenForgeDiffEntrySummary>
          columns={diffColumns}
          dataSource={[...diff.entries]}
          loading={loading}
          pagination={{ pageSize: 8 }}
          rowKey="targetPath"
          search={false}
          size="small"
          toolBarRender={false}
          headerTitle="Diff plan"
        />

        <ProTable<OpenForgeDoctorCheckSummary>
          columns={doctorColumns}
          dataSource={[...doctor.checks]}
          loading={loading}
          pagination={{ pageSize: 8 }}
          rowKey="id"
          search={false}
          size="small"
          toolBarRender={false}
          headerTitle="Doctor checks"
        />

        <ProTable<OpenForgeManifestListEntrySummary>
          columns={manifestColumns}
          dataSource={[...manifests.manifests]}
          loading={loading}
          pagination={{ pageSize: 8 }}
          rowKey="id"
          search={false}
          size="small"
          toolBarRender={false}
          headerTitle="OpenForge manifests"
          rowSelection={{
            type: 'radio',
            selectedRowKeys: activeManifestId ? [activeManifestId] : [],
            onChange: (keys) => setSelectedManifestId(String(keys[0])),
          }}
        />

        <Typography.Paragraph type="secondary">
          {fallbackApplyDryRun.mode} apply is the only Admin apply surface in
          this round.
        </Typography.Paragraph>
      </Space>
    </PageContainer>
  );
}
