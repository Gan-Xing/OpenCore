import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import {
  createIntegrationFixtures,
  findOAuthCallbackContractFixture,
  type OAuthCallbackContractSummary,
} from '@opencore/sdk';
import { Tag, Typography } from 'antd';
import { useState } from 'react';
import {
  CurrentPageExportButton,
  type CurrentPageExportColumn,
} from '../shared/CurrentPageExportButton';
import {
  createCurrentPageFilterOptions,
  useCurrentPageFilters,
  type CurrentPageFilterOption,
  type CurrentPageSearchField,
} from '../shared/CurrentPageFilters';
import { ReadOnlyDetailDrawer } from '../shared/ReadOnlyDetailDrawer';

const rows = [createIntegrationFixtures().oauthContract];
const exportColumns: CurrentPageExportColumn<OAuthCallbackContractSummary>[] = [
  { title: 'Callback Path', dataIndex: 'callbackPath' },
  { title: 'State TTL Seconds', dataIndex: 'stateTtlSeconds' },
  { title: 'Audit Action', dataIndex: 'auditAction' },
  {
    title: 'Security Checks',
    renderText: (record) => record.securityChecks.join(', '),
  },
  {
    title: 'Account Binding',
    renderText: (record) => record.accountBinding.join(', '),
    sensitive: true,
  },
];
const searchFields: CurrentPageSearchField<OAuthCallbackContractSummary>[] = [
  'callbackPath',
  'auditAction',
  (record) => record.securityChecks,
];
const filterOptions: CurrentPageFilterOption<OAuthCallbackContractSummary>[] = [
  {
    key: 'auditAction',
    options: createCurrentPageFilterOptions(rows, 'auditAction'),
    placeholder: 'Audit',
    predicate: (record, value) => record.auditAction === value,
  },
];

export default function OAuthIntegrationPage() {
  const [selected, setSelected] = useState<OAuthCallbackContractSummary>();
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<OAuthCallbackContractSummary>({
      rows,
      searchFields,
      searchPlaceholder: 'Search OAuth',
      selectFilters: filterOptions,
    });

  const openDetail = (callbackPath: string) => {
    setSelected(findOAuthCallbackContractFixture(callbackPath));
  };

  const columns: ProColumns<OAuthCallbackContractSummary>[] = [
    {
      title: 'Callback Path',
      dataIndex: 'callbackPath',
      render: (_, record) => (
        <Typography.Link onClick={() => openDetail(record.callbackPath)}>
          {record.callbackPath}
        </Typography.Link>
      ),
    },
    { title: 'State TTL', dataIndex: 'stateTtlSeconds' },
    {
      title: 'Audit',
      render: (_, record) => <Tag color="blue">{record.auditAction}</Tag>,
    },
    {
      title: 'Security',
      renderText: (_, record) => record.securityChecks.join(', '),
    },
    {
      title: 'Action',
      valueType: 'option',
      render: (_, record) => (
        <a onClick={() => openDetail(record.callbackPath)}>Detail</a>
      ),
    },
  ];

  return (
    <PageContainer title="OAuth" subTitle="S12 Integrations">
      <ProTable<OAuthCallbackContractSummary>
        rowKey="callbackPath"
        search={false}
        options={false}
        toolBarRender={() => [
          filterToolbar,
          <CurrentPageExportButton<OAuthCallbackContractSummary>
            key="export"
            columns={exportColumns}
            resource="integration-oauth"
            rows={filteredRows}
          />,
        ]}
        pagination={false}
        dataSource={filteredRows}
        columns={columns}
      />
      <ReadOnlyDetailDrawer
        fields={[
          { label: 'Callback Path', value: selected?.callbackPath },
          { label: 'State TTL Seconds', value: selected?.stateTtlSeconds },
          { label: 'Audit Action', value: selected?.auditAction },
          {
            label: 'Security Checks',
            value: selected?.securityChecks.join(', '),
          },
          {
            label: 'Account Binding',
            value: selected?.accountBinding.join(', '),
          },
        ]}
        onClose={() => setSelected(undefined)}
        open={Boolean(selected)}
        title="OAuth Callback Detail"
      />
    </PageContainer>
  );
}
