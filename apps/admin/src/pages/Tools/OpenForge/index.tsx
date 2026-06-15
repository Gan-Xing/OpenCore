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
import { useEffect, useMemo, useState } from 'react';
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

const manifestEntryColumns: ProColumns<OpenForgeManifestEntrySummary>[] = [
  { title: 'Kind', dataIndex: 'artifactKind', width: 180 },
  { title: 'Target path', dataIndex: 'targetPath' },
  {
    title: 'Action',
    dataIndex: 'action',
    width: 120,
    render: (_, record) => <Tag>{record.action}</Tag>,
  },
  {
    title: 'Rollback',
    dataIndex: 'rollbackAction',
    width: 120,
    render: (_, record) => <Tag>{record.rollbackAction}</Tag>,
  },
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
        error instanceof Error ? error.message : 'Unable to load OpenForge.',
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
            <Descriptions.Item label="Manifest path">
              {detail.manifestPath || 'dry-run'}
            </Descriptions.Item>
            <Descriptions.Item label="Manifest ID">
              {manifest?.id ?? 'not available'}
            </Descriptions.Item>
            <Descriptions.Item label="Module">
              {manifest?.moduleCode ?? 'not available'}
            </Descriptions.Item>
            <Descriptions.Item label="Entries">
              {manifest?.entries.length ?? 0}
            </Descriptions.Item>
            <Descriptions.Item label="Errors">
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
      message.error('OpenForge status must load before dry-run apply.');
      return;
    }

    Modal.confirm({
      title: 'Confirm OpenForge dry-run apply',
      okText: 'Dry-run apply',
      content: `Dry-run confirmation required: ${dryRunConfirmationText}`,
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
            'OpenForge dry-run apply manifest',
          );
        } catch (error: unknown) {
          message.error(
            error instanceof Error
              ? error.message
              : 'OpenForge dry-run failed.',
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
      showManifestDetail(result, 'OpenForge manifest preview');
    } catch (error: unknown) {
      message.error(
        error instanceof Error ? error.message : 'OpenForge preview failed.',
      );
    } finally {
      setDryRunning(false);
    }
  };

  const viewManifestDetail = async () => {
    if (!activeManifestId) {
      message.warning('No OpenForge manifest selected.');
      return;
    }

    setDryRunning(true);
    try {
      const result = await getOpenCoreOpenForgeManifest(activeManifestId);
      showManifestDetail(result, 'OpenForge manifest detail');
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : 'OpenForge manifest detail failed.',
      );
    } finally {
      setDryRunning(false);
    }
  };

  const runRollbackDryRun = () => {
    if (!activeManifestId) {
      message.warning('No OpenForge manifest selected.');
      return;
    }
    if (!dryRunConfirmationText) {
      message.error('OpenForge status must load before dry-run rollback.');
      return;
    }

    Modal.confirm({
      title: 'Confirm OpenForge rollback dry-run',
      okText: 'Dry-run rollback',
      content: `Dry-run confirmation required: ${dryRunConfirmationText}`,
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
            'OpenForge rollback dry-run manifest',
          );
        } catch (error: unknown) {
          message.error(
            error instanceof Error
              ? error.message
              : 'OpenForge rollback failed.',
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
        title: 'Artifacts',
        value: plan?.artifacts.length ?? 0,
      },
      {
        title: 'Protected',
        value: plan ? countProtected(plan) : 0,
      },
      {
        title: 'Diff conflicts',
        value: diff ? countConflicts(diff.entries) : 0,
      },
      {
        title: 'Doctor checks',
        value: doctor?.checks.length ?? 0,
      },
    ],
    [diff, doctor, plan],
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
            {status?.workspace.projectName ?? 'not loaded'}
          </Descriptions.Item>
          <Descriptions.Item label="Template">
            {status?.generatorCore.templateVersion ?? 'not loaded'}
          </Descriptions.Item>
          <Descriptions.Item label="No write">
            <Tag color={status?.workspace.noWrite ? 'green' : 'default'}>
              {status ? String(status.workspace.noWrite) : 'not loaded'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Dry-run confirmation">
            {dryRunConfirmationText ?? 'not loaded'}
          </Descriptions.Item>
          <Descriptions.Item label="Preflight">
            <Tag
              color={
                preflight ? (preflight.valid ? 'green' : 'red') : 'default'
              }
            >
              {preflight
                ? preflight.valid
                  ? 'valid'
                  : 'invalid'
                : 'not loaded'}
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
              disabled={!canManageOpenForge || !dryRunConfirmationText}
              onClick={runApplyDryRun}
            >
              Dry-run apply
            </Button>
          </Tooltip>
          <Tooltip title="Manifest preview">
            <Button
              icon={<FileSearchOutlined />}
              loading={dryRunning}
              onClick={() => void runManifestPreview()}
            >
              Manifest preview
            </Button>
          </Tooltip>
          <Tooltip title="Manifest detail">
            <Button
              icon={<FileSearchOutlined />}
              loading={dryRunning}
              disabled={!activeManifestId}
              onClick={() => void viewManifestDetail()}
            >
              Manifest detail
            </Button>
          </Tooltip>
          <Tooltip title="Requires tool:openforge:manage">
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
              Dry-run rollback
            </Button>
          </Tooltip>
          <Tag icon={<SafetyCertificateOutlined />}>tool:openforge:manage</Tag>
          <Tag icon={<FileSearchOutlined />}>
            {preflight?.schemaPath ?? 'schema not loaded'}
          </Tag>
          <Tag icon={<DiffOutlined />}>
            {plan?.moduleCode ?? 'module not loaded'}
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
          headerTitle="Plan artifacts"
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
          headerTitle="Diff plan"
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
          headerTitle="Doctor checks"
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
          headerTitle="OpenForge manifests"
          rowSelection={{
            type: 'radio',
            selectedRowKeys: activeManifestId ? [activeManifestId] : [],
            onChange: (keys) => setSelectedManifestId(String(keys[0])),
          }}
        />

        <Typography.Paragraph type="secondary">
          Dry-run apply is guarded by live OpenForge confirmation; write apply
          remains outside the admitted OpenForge surface.
        </Typography.Paragraph>
      </Space>
    </PageContainer>
  );
}
