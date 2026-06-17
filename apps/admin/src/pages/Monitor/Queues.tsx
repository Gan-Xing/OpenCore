import {
  PauseCircleOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import { useAccess, useIntl } from '@umijs/max';
import type { QueueStatusList, QueueStatusSummary } from '@opencore/sdk';
import {
  Alert,
  Button,
  Modal,
  Space,
  Statistic,
  Tag,
  Tooltip,
  message,
} from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  listOpenCoreMonitorQueues,
  pauseOpenCoreMonitorQueue,
  resumeOpenCoreMonitorQueue,
} from '@/services/opencore/platform';

const emptyQueues: QueueStatusList = {
  checkedAt: '',
  queues: [],
};

type FormatMessage = (
  id: string,
  defaultMessage: string,
  values?: Record<string, number | string>,
) => string;

function controlModeColor(mode: QueueStatusSummary['controlMode']): string {
  return mode === 'managed' ? 'blue' : 'default';
}

export default function QueuesPage() {
  const access = useAccess();
  const intl = useIntl();
  const canManageQueues = Boolean(access.canManageQueues);
  const [queues, setQueues] = useState<QueueStatusList>(emptyQueues);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [controllingQueue, setControllingQueue] = useState<string>();
  const formatMessage: FormatMessage = useCallback(
    (id, defaultMessage, values) =>
      values
        ? intl.formatMessage({ id, defaultMessage }, values)
        : intl.formatMessage({ id, defaultMessage }),
    [intl],
  );
  const queueStateLabels = useMemo(
    () => ({
      paused: formatMessage('pages.monitor.queues.state.paused', 'paused'),
      running: formatMessage('pages.monitor.queues.state.running', 'running'),
    }),
    [formatMessage],
  );
  const controlModeLabels = useMemo(
    () => ({
      managed: formatMessage(
        'pages.monitor.queues.controlMode.managed',
        'managed',
      ),
      unavailable: formatMessage(
        'pages.monitor.queues.controlMode.unavailable',
        'unavailable',
      ),
    }),
    [formatMessage],
  );

  const loadQueues = useCallback(async () => {
    setLoading(true);
    try {
      const nextQueues = await listOpenCoreMonitorQueues();
      setQueues(nextQueues);
      setLoadError(undefined);
    } catch (error: unknown) {
      setLoadError(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.monitor.queues.load.failure',
              'Unable to load queues.',
            ),
      );
    } finally {
      setLoading(false);
    }
  }, [formatMessage]);

  useEffect(() => {
    void loadQueues();
  }, [loadQueues]);

  const confirmQueueControl = useCallback(
    (record: QueueStatusSummary, action: 'pause' | 'resume') => {
      Modal.confirm({
        title:
          action === 'pause'
            ? formatMessage(
                'pages.monitor.queues.confirm.pause',
                'Pause {name}?',
                { name: record.name },
              )
            : formatMessage(
                'pages.monitor.queues.confirm.resume',
                'Resume {name}?',
                { name: record.name },
              ),
        content:
          action === 'pause'
            ? formatMessage(
                'pages.monitor.queues.confirm.pauseContent',
                'New BullMQ jobs for this queue will stop being processed until the queue is resumed.',
              )
            : formatMessage(
                'pages.monitor.queues.confirm.resumeContent',
                'Queued BullMQ jobs can be processed again after this queue is resumed.',
              ),
        okButtonProps: { danger: action === 'pause' },
        okText:
          action === 'pause'
            ? formatMessage(
                'pages.monitor.queues.actions.pauseQueue',
                'Pause queue',
              )
            : formatMessage(
                'pages.monitor.queues.actions.resumeQueue',
                'Resume queue',
              ),
        onOk: async () => {
          setControllingQueue(`${record.name}:${action}`);
          try {
            const result =
              action === 'pause'
                ? await pauseOpenCoreMonitorQueue(record.name)
                : await resumeOpenCoreMonitorQueue(record.name);
            message.success(
              result.queue.paused
                ? formatMessage(
                    'pages.monitor.queues.messages.paused',
                    '{name} paused',
                    { name: result.name },
                  )
                : formatMessage(
                    'pages.monitor.queues.messages.resumed',
                    '{name} resumed',
                    { name: result.name },
                  ),
            );
            await loadQueues();
          } finally {
            setControllingQueue(undefined);
          }
        },
      });
    },
    [formatMessage, loadQueues],
  );

  const columns = useMemo<ProColumns<QueueStatusSummary>[]>(
    () => [
      {
        title: formatMessage('pages.monitor.queues.fields.queue', 'Queue'),
        dataIndex: 'name',
      },
      {
        title: formatMessage('pages.monitor.queues.fields.driver', 'Driver'),
        dataIndex: 'driver',
      },
      {
        title: formatMessage('pages.monitor.queues.fields.waiting', 'Waiting'),
        dataIndex: 'waiting',
      },
      {
        title: formatMessage('pages.monitor.queues.fields.active', 'Active'),
        dataIndex: 'active',
      },
      {
        title: formatMessage(
          'pages.monitor.queues.fields.completed',
          'Completed',
        ),
        dataIndex: 'completed',
      },
      {
        title: formatMessage('pages.monitor.queues.fields.failed', 'Failed'),
        dataIndex: 'failed',
      },
      {
        title: formatMessage('pages.monitor.queues.fields.paused', 'Paused'),
        dataIndex: 'paused',
        render: (_, record) => (
          <Tag color={record.paused ? 'orange' : 'green'}>
            {record.paused ? queueStateLabels.paused : queueStateLabels.running}
          </Tag>
        ),
      },
      {
        title: formatMessage(
          'pages.monitor.queues.fields.controlMode',
          'Control mode',
        ),
        dataIndex: 'controlMode',
        render: (_, record) => (
          <Tag color={controlModeColor(record.controlMode)}>
            {controlModeLabels[record.controlMode]}
          </Tag>
        ),
      },
      {
        title: formatMessage('pages.monitor.queues.actions.column', 'Action'),
        valueType: 'option',
        width: 96,
        render: (_, record) => {
          const action = record.paused ? 'resume' : 'pause';
          const title = canManageQueues
            ? action === 'pause'
              ? formatMessage(
                  'pages.monitor.queues.actions.pauseQueue',
                  'Pause queue',
                )
              : formatMessage(
                  'pages.monitor.queues.actions.resumeQueue',
                  'Resume queue',
                )
            : formatMessage(
                'pages.monitor.queues.permission.manageRequired',
                'Requires monitor:queue:manage',
              );

          return (
            <Tooltip title={title}>
              <Button
                aria-label={
                  action === 'pause'
                    ? formatMessage(
                        'pages.monitor.queues.actions.pauseAria',
                        'Pause queue {name}',
                        { name: record.name },
                      )
                    : formatMessage(
                        'pages.monitor.queues.actions.resumeAria',
                        'Resume queue {name}',
                        { name: record.name },
                      )
                }
                disabled={!canManageQueues || record.controlMode !== 'managed'}
                icon={
                  action === 'pause' ? (
                    <PauseCircleOutlined />
                  ) : (
                    <PlayCircleOutlined />
                  )
                }
                loading={controllingQueue === `${record.name}:${action}`}
                onClick={() => confirmQueueControl(record, action)}
                size="small"
              />
            </Tooltip>
          );
        },
      },
    ],
    [
      canManageQueues,
      controlModeLabels,
      controllingQueue,
      confirmQueueControl,
      formatMessage,
      queueStateLabels,
    ],
  );

  return (
    <PageContainer
      title={formatMessage('pages.monitor.queues.title', 'Queues')}
      subTitle={formatMessage('pages.monitor.runtime.section', 'S8 Monitor')}
    >
      {loadError ? (
        <Alert
          message={formatMessage(
            'pages.monitor.queues.load.liveFailure',
            'Unable to load live queue metrics',
          )}
          description={loadError}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      ) : null}
      <Space size="large" style={{ marginBottom: 16 }} wrap>
        <Statistic
          title={formatMessage(
            'pages.monitor.queues.stats.schedulerQueues',
            'Scheduler queues',
          )}
          value={queues.queues.length}
        />
        <Statistic
          title={formatMessage(
            'pages.monitor.queues.fields.waiting',
            'Waiting',
          )}
          value={queues.queues.reduce((sum, queue) => sum + queue.waiting, 0)}
        />
        <Statistic
          title={formatMessage('pages.monitor.queues.fields.active', 'Active')}
          value={queues.queues.reduce((sum, queue) => sum + queue.active, 0)}
        />
        <Statistic
          title={formatMessage(
            'pages.monitor.queues.stats.queueMetrics',
            'Queue metrics',
          )}
          value={formatMessage(
            'pages.monitor.queues.stats.bullmqManaged',
            'BullMQ managed',
          )}
        />
        <Statistic
          title={formatMessage(
            'pages.monitor.queues.stats.pausedQueues',
            'Paused queues',
          )}
          value={queues.queues.filter((queue) => queue.paused).length}
        />
        <Statistic
          title={formatMessage(
            'pages.monitor.queues.stats.queueControl',
            'Queue control',
          )}
          value={formatMessage(
            'pages.monitor.queues.stats.pauseResumeQueues',
            'Pause/resume queues',
          )}
        />
        <Statistic
          title={formatMessage(
            'pages.monitor.queues.stats.permission',
            'Permission',
          )}
          value="monitor:queue:manage"
        />
      </Space>
      <ProTable<QueueStatusSummary>
        rowKey="name"
        search={false}
        options={false}
        toolBarRender={() => [
          <Tooltip
            key="reload"
            title={formatMessage(
              'pages.monitor.queues.actions.reload',
              'Reload',
            )}
          >
            <Button
              aria-label={formatMessage(
                'pages.monitor.queues.actions.reloadAria',
                'Reload queues',
              )}
              icon={<ReloadOutlined />}
              onClick={() => void loadQueues()}
            />
          </Tooltip>,
        ]}
        pagination={false}
        loading={loading}
        dataSource={[...queues.queues]}
        columns={columns}
      />
    </PageContainer>
  );
}
