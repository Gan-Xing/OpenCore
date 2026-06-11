import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import {
  createSystemStatusFixture,
  type DependencyStatusSummary,
  type SystemStatusSummary,
} from '@opencore/sdk';
import { Alert, Statistic, Tag } from 'antd';
import { useEffect, useState } from 'react';
import { getOpenCoreSystemStatus } from '@/services/opencore/platform';

const fallbackStatus = createSystemStatusFixture();

const columns: ProColumns<DependencyStatusSummary>[] = [
  { title: 'Dependency', dataIndex: 'name' },
  {
    title: 'Status',
    dataIndex: 'status',
    render: (_, record) => (
      <Tag color={record.status === 'ok' ? 'green' : 'red'}>
        {record.status}
      </Tag>
    ),
  },
  { title: 'Latency', dataIndex: 'latencyMs' },
  { title: 'Message', dataIndex: 'message' },
];

export default function StatusPage() {
  const [status, setStatus] = useState<SystemStatusSummary>(fallbackStatus);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();

  useEffect(() => {
    let mounted = true;

    getOpenCoreSystemStatus()
      .then((summary) => {
        if (mounted) {
          setStatus(summary);
          setLoadError(undefined);
        }
      })
      .catch((error: unknown) => {
        if (mounted) {
          setStatus(fallbackStatus);
          setLoadError(
            error instanceof Error
              ? error.message
              : 'Unable to load OpenCore system status.',
          );
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <PageContainer title="System Status" subTitle="S8 Monitor">
      {loadError ? (
        <Alert
          showIcon
          type="warning"
          message="Using fallback monitor snapshot"
          description={loadError}
          style={{ marginBlockEnd: 16 }}
        />
      ) : null}
      <Statistic title="Overall status" value={status.status} />
      <ProTable<DependencyStatusSummary>
        rowKey="name"
        loading={loading}
        search={false}
        options={false}
        pagination={false}
        dataSource={[...status.dependencies]}
        columns={columns}
      />
    </PageContainer>
  );
}
