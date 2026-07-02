import {
  CheckCircleOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  RetweetOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons';
import {
  type ActionType,
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import type {
  BusinessLifecycleCustomerSummary,
  BusinessLifecycleSummary,
  BusinessLifecycleTimelineEventSummary,
  BusinessPoolEntrySummary,
} from '@opencore/sdk';
import { useAccess, useIntl } from '@umijs/max';
import {
  Button,
  Card,
  Col,
  Drawer,
  Form,
  Input,
  List,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import zhMessages from '@/locales/zh-CN';
import {
  assignOpenCoreBusinessPoolEntry,
  changeOpenCoreBusinessCustomerLifecycleStage,
  claimOpenCoreBusinessPoolEntry,
  enterOpenCoreBusinessPool,
  getOpenCoreBusinessLifecycleSummary,
  pageOpenCoreBusinessCustomerTimeline,
  pageOpenCoreBusinessLifecycleCustomers,
  pageOpenCoreBusinessPoolEntries,
  recycleOpenCoreBusinessPoolEntry,
  transferOpenCoreBusinessPoolEntry,
} from '@/services/opencore/platform';

type LifecycleRouteKey = 'lifecycle' | 'pool';
type FormatMessage = (
  id: string,
  defaultMessage: string,
  values?: Record<string, number | string>,
) => string;

const DEFAULT_ACTOR = 'admin';
const MESSAGE_PREFIX = 'pages.business.lifecycle.';
const POOL_TARGET_TYPES = ['lead', 'customer'] as const;
const POOL_STATUSES = [
  'available',
  'claimed',
  'assigned',
  'recycled',
  'archived',
] as const;
const LIFECYCLE_STAGES = [
  'potential',
  'assigned',
  'in_progress',
  'won',
  'fulfillment',
  'renewal',
  'lost',
  'archived',
] as const;
const ROUTE_TITLE_FALLBACKS: Record<LifecycleRouteKey, string> = {
  lifecycle: 'Customer Lifecycle',
  pool: 'Assignment Pool',
};

function lifecycleMessageId(suffix: string): string {
  return `${MESSAGE_PREFIX}${suffix}`;
}

function valueEnum(
  values: readonly string[],
  formatMessage: FormatMessage,
  scope: string,
) {
  return Object.fromEntries(
    values.map((value) => [
      value,
      { text: formatMessage(lifecycleMessageId(`${scope}.${value}`), value) },
    ]),
  );
}

function enumOptions(
  values: readonly string[],
  formatMessage: FormatMessage,
  scope: string,
) {
  return values.map((value) => ({
    label: formatMessage(lifecycleMessageId(`${scope}.${value}`), value),
    value,
  }));
}

function statusColor(value?: string): string {
  if (!value) return 'default';
  if (
    ['assigned', 'claimed', 'fulfillment', 'in_progress', 'won'].includes(value)
  ) {
    return 'green';
  }
  if (['archived', 'lost', 'recycled'].includes(value)) return 'red';
  if (['available', 'potential'].includes(value)) return 'blue';
  if (value === 'renewal') return 'gold';
  return 'default';
}

function dateText(value?: string): string {
  return value ? new Date(value).toLocaleString() : '-';
}

function routeTitle(
  routeKey: LifecycleRouteKey,
  formatMessage: FormatMessage,
): string {
  return formatMessage(
    lifecycleMessageId(`tabs.${routeKey}`),
    ROUTE_TITLE_FALLBACKS[routeKey],
  );
}

export function LifecycleWorkspace({
  routeKey,
}: {
  routeKey: LifecycleRouteKey;
}) {
  const intl = useIntl();
  const access = useAccess();
  const poolActionRef = useRef<ActionType | undefined>(undefined);
  const customerActionRef = useRef<ActionType | undefined>(undefined);
  const [summary, setSummary] = useState<BusinessLifecycleSummary>();
  const [enterModalOpen, setEnterModalOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<BusinessPoolEntrySummary>();
  const [ownerAction, setOwnerAction] = useState<'assign' | 'transfer'>(
    'assign',
  );
  const [stageTarget, setStageTarget] =
    useState<BusinessLifecycleCustomerSummary>();
  const [timelineTarget, setTimelineTarget] =
    useState<BusinessLifecycleCustomerSummary>();
  const [timeline, setTimeline] = useState<
    BusinessLifecycleTimelineEventSummary[]
  >([]);
  const [submitting, setSubmitting] = useState(false);
  const [enterForm] = Form.useForm();
  const [assignForm] = Form.useForm();
  const [stageForm] = Form.useForm();

  const formatMessage = useCallback<FormatMessage>(
    (id, defaultMessage, values) => {
      const fallback =
        (zhMessages as Record<string, string>)[id] ?? defaultMessage;
      return intl.formatMessage(
        { defaultMessage: fallback, id },
        values,
      ) as string;
    },
    [intl],
  );

  const reloadSummary = useCallback(async () => {
    setSummary(await getOpenCoreBusinessLifecycleSummary());
  }, []);

  useEffect(() => {
    void reloadSummary();
  }, [reloadSummary]);

  useEffect(() => {
    if (!timelineTarget) {
      setTimeline([]);
      return;
    }
    void pageOpenCoreBusinessCustomerTimeline(timelineTarget.id, {
      page: 1,
      pageSize: 50,
    }).then((page) => setTimeline([...page.items]));
  }, [timelineTarget]);

  const poolColumns = useMemo<ProColumns<BusinessPoolEntrySummary>[]>(
    () => [
      {
        dataIndex: 'displayName',
        title: formatMessage(lifecycleMessageId('columns.name'), 'Name'),
        width: 260,
      },
      {
        dataIndex: 'targetType',
        title: formatMessage(lifecycleMessageId('columns.type'), 'Type'),
        valueEnum: valueEnum(POOL_TARGET_TYPES, formatMessage, 'targetType'),
        width: 120,
      },
      {
        dataIndex: 'source',
        title: formatMessage(lifecycleMessageId('columns.source'), 'Source'),
        width: 140,
      },
      {
        dataIndex: 'status',
        render: (_, row) => (
          <Tag color={statusColor(row.status)}>
            {formatMessage(
              lifecycleMessageId(`poolStatus.${row.status}`),
              row.status,
            )}
          </Tag>
        ),
        title: formatMessage(lifecycleMessageId('columns.status'), 'Status'),
        valueEnum: valueEnum(POOL_STATUSES, formatMessage, 'poolStatus'),
        width: 130,
      },
      {
        dataIndex: 'owner',
        title: formatMessage(lifecycleMessageId('columns.owner'), 'Owner'),
        width: 140,
      },
      {
        dataIndex: 'assignedTo',
        title: formatMessage(
          lifecycleMessageId('columns.assignedTo'),
          'Assigned To',
        ),
        width: 140,
      },
      {
        dataIndex: 'duplicateCount',
        title: formatMessage(
          lifecycleMessageId('columns.duplicateCount'),
          'Duplicate',
        ),
        width: 110,
      },
      {
        dataIndex: 'createdAt',
        render: (_, row) => dateText(row.createdAt),
        title: formatMessage(
          lifecycleMessageId('columns.createdAt'),
          'Created',
        ),
        valueType: 'dateTime',
        width: 190,
      },
      {
        fixed: 'right',
        render: (_, row) => (
          <Space size="small">
            <Tooltip
              title={formatMessage(
                lifecycleMessageId('actions.claim'),
                'Claim',
              )}
            >
              <Button
                disabled={
                  !access.canUpdateBusiness || row.status !== 'available'
                }
                icon={<CheckCircleOutlined />}
                size="small"
                type="text"
                onClick={async () => {
                  await claimOpenCoreBusinessPoolEntry(row.id, {
                    actor: DEFAULT_ACTOR,
                  });
                  message.success(
                    formatMessage(
                      lifecycleMessageId('messages.claimed'),
                      'Claimed',
                    ),
                  );
                  poolActionRef.current?.reload();
                  void reloadSummary();
                }}
              />
            </Tooltip>
            <Tooltip
              title={formatMessage(
                lifecycleMessageId('actions.assign'),
                'Assign',
              )}
            >
              <Button
                disabled={!access.canAssignBusiness}
                icon={<UserSwitchOutlined />}
                size="small"
                type="text"
                onClick={() => {
                  setOwnerAction('assign');
                  setAssignTarget(row);
                  assignForm.setFieldsValue({
                    actor: DEFAULT_ACTOR,
                    toOwner: row.assignedTo ?? row.owner ?? DEFAULT_ACTOR,
                  });
                }}
              />
            </Tooltip>
            <Tooltip
              title={formatMessage(
                lifecycleMessageId('actions.transfer'),
                'Transfer',
              )}
            >
              <Button
                disabled={!access.canAssignBusiness}
                icon={<UserSwitchOutlined />}
                size="small"
                type="text"
                onClick={() => {
                  setOwnerAction('transfer');
                  setAssignTarget(row);
                  assignForm.setFieldsValue({
                    actor: DEFAULT_ACTOR,
                    toOwner: row.owner ?? row.assignedTo ?? DEFAULT_ACTOR,
                  });
                }}
              />
            </Tooltip>
            <Popconfirm
              disabled={!access.canUpdateBusiness}
              title={formatMessage(
                lifecycleMessageId('actions.recycleConfirm'),
                'Recycle this resource?',
              )}
              onConfirm={async () => {
                await recycleOpenCoreBusinessPoolEntry(row.id, {
                  actor: DEFAULT_ACTOR,
                });
                message.success(
                  formatMessage(
                    lifecycleMessageId('messages.recycled'),
                    'Recycled',
                  ),
                );
                poolActionRef.current?.reload();
                void reloadSummary();
              }}
            >
              <Tooltip
                title={formatMessage(
                  lifecycleMessageId('actions.recycle'),
                  'Recycle',
                )}
              >
                <Button
                  disabled={!access.canUpdateBusiness}
                  icon={<RetweetOutlined />}
                  size="small"
                  type="text"
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        ),
        search: false,
        title: formatMessage(lifecycleMessageId('columns.action'), 'Action'),
        width: 150,
      },
    ],
    [access, assignForm, formatMessage, reloadSummary],
  );

  const customerColumns = useMemo<
    ProColumns<BusinessLifecycleCustomerSummary>[]
  >(
    () => [
      {
        dataIndex: 'name',
        title: formatMessage(lifecycleMessageId('columns.name'), 'Name'),
        width: 260,
      },
      {
        dataIndex: 'number',
        title: formatMessage(lifecycleMessageId('columns.number'), 'Number'),
        width: 180,
      },
      {
        dataIndex: 'owner',
        title: formatMessage(lifecycleMessageId('columns.owner'), 'Owner'),
        width: 130,
      },
      {
        dataIndex: 'lifecycleStage',
        render: (_, row) => (
          <Tag color={statusColor(row.lifecycleStage)}>
            {formatMessage(
              lifecycleMessageId(`stage.${row.lifecycleStage}`),
              row.lifecycleStage,
            )}
          </Tag>
        ),
        title: formatMessage(
          lifecycleMessageId('columns.lifecycleStage'),
          'Stage',
        ),
        valueEnum: valueEnum(LIFECYCLE_STAGES, formatMessage, 'stage'),
        width: 150,
      },
      {
        dataIndex: 'opportunityCount',
        search: false,
        title: formatMessage(
          lifecycleMessageId('columns.opportunities'),
          'Opportunities',
        ),
        width: 120,
      },
      {
        dataIndex: 'quoteCount',
        search: false,
        title: formatMessage(lifecycleMessageId('columns.quotes'), 'Quotes'),
        width: 100,
      },
      {
        dataIndex: 'contractCount',
        search: false,
        title: formatMessage(
          lifecycleMessageId('columns.contracts'),
          'Contracts',
        ),
        width: 110,
      },
      {
        dataIndex: 'receivableCount',
        search: false,
        title: formatMessage(
          lifecycleMessageId('columns.receivables'),
          'Receivables',
        ),
        width: 120,
      },
      {
        dataIndex: 'lifecycleChangedAt',
        render: (_, row) => dateText(row.lifecycleChangedAt),
        search: false,
        title: formatMessage(
          lifecycleMessageId('columns.lifecycleChangedAt'),
          'Changed At',
        ),
        width: 190,
      },
      {
        fixed: 'right',
        render: (_, row) => (
          <Space size="small">
            <Tooltip
              title={formatMessage(
                lifecycleMessageId('actions.stage'),
                'Change Stage',
              )}
            >
              <Button
                disabled={!access.canUpdateBusiness}
                icon={<RetweetOutlined />}
                size="small"
                type="text"
                onClick={() => {
                  setStageTarget(row);
                  stageForm.setFieldsValue({
                    actor: DEFAULT_ACTOR,
                    toStage: row.lifecycleStage,
                  });
                }}
              />
            </Tooltip>
            <Tooltip
              title={formatMessage(
                lifecycleMessageId('actions.timeline'),
                'Timeline',
              )}
            >
              <Button
                icon={<EyeOutlined />}
                size="small"
                type="text"
                onClick={() => setTimelineTarget(row)}
              />
            </Tooltip>
          </Space>
        ),
        search: false,
        title: formatMessage(lifecycleMessageId('columns.action'), 'Action'),
        width: 130,
      },
    ],
    [access.canUpdateBusiness, formatMessage, stageForm],
  );

  const title = routeTitle(routeKey, formatMessage);

  return (
    <PageContainer
      title={title}
      extra={[
        <Button
          icon={<ReloadOutlined />}
          key="reload"
          onClick={() => {
            void reloadSummary();
            poolActionRef.current?.reload();
            customerActionRef.current?.reload();
          }}
        />,
        routeKey === 'pool' ? (
          <Button
            disabled={!access.canCreateBusiness}
            icon={<PlusOutlined />}
            key="enter"
            type="primary"
            onClick={() => {
              enterForm.setFieldsValue({
                actor: DEFAULT_ACTOR,
                targetType: 'lead',
              });
              setEnterModalOpen(true);
            }}
          >
            {formatMessage(
              lifecycleMessageId('actions.enterPool'),
              'Enter Pool',
            )}
          </Button>
        ) : null,
      ]}
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={formatMessage(
                lifecycleMessageId('summary.availablePool'),
                'Available Pool',
              )}
              value={summary?.availablePool ?? 0}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={formatMessage(
                lifecycleMessageId('summary.assignedPool'),
                'Assigned Pool',
              )}
              value={summary?.assignedPool ?? 0}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={formatMessage(
                lifecycleMessageId('summary.customers'),
                'Customers',
              )}
              value={summary?.customers ?? 0}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={formatMessage(
                lifecycleMessageId('summary.receivableBalance'),
                'Receivable Balance',
              )}
              value={summary?.receivableBalance ?? '0.00'}
            />
          </Card>
        </Col>
      </Row>

      {routeKey === 'pool' ? (
        <ProTable<BusinessPoolEntrySummary>
          actionRef={poolActionRef}
          columns={poolColumns}
          rowKey="id"
          scroll={{ x: 1500 }}
          search={{ labelWidth: 96 }}
          style={{ marginTop: 16 }}
          request={async (params) => {
            const page = await pageOpenCoreBusinessPoolEntries({
              assignedTo: params.assignedTo as string | undefined,
              keyword: params.keyword as string | undefined,
              owner: params.owner as string | undefined,
              page: params.current,
              pageSize: params.pageSize,
              status: params.status as never,
              targetType: params.targetType as never,
            });
            return {
              data: [...page.items],
              success: true,
              total: page.total,
            };
          }}
        />
      ) : (
        <ProTable<BusinessLifecycleCustomerSummary>
          actionRef={customerActionRef}
          columns={customerColumns}
          rowKey="id"
          scroll={{ x: 1460 }}
          search={{ labelWidth: 96 }}
          style={{ marginTop: 16 }}
          request={async (params) => {
            const page = await pageOpenCoreBusinessLifecycleCustomers({
              keyword: params.keyword as string | undefined,
              lifecycleStage: params.lifecycleStage as never,
              owner: params.owner as string | undefined,
              page: params.current,
              pageSize: params.pageSize,
            });
            return {
              data: [...page.items],
              success: true,
              total: page.total,
            };
          }}
        />
      )}

      <Modal
        destroyOnClose
        confirmLoading={submitting}
        open={enterModalOpen}
        title={formatMessage(
          lifecycleMessageId('modal.enterPool'),
          'Enter Pool',
        )}
        onCancel={() => setEnterModalOpen(false)}
        onOk={async () => {
          const values = await enterForm.validateFields();
          setSubmitting(true);
          try {
            await enterOpenCoreBusinessPool(values);
            message.success(
              formatMessage(lifecycleMessageId('messages.entered'), 'Entered'),
            );
            setEnterModalOpen(false);
            poolActionRef.current?.reload();
            void reloadSummary();
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <Form form={enterForm} layout="vertical">
          <Form.Item
            label={formatMessage(
              lifecycleMessageId('fields.targetType'),
              'Type',
            )}
            name="targetType"
            rules={[{ required: true }]}
          >
            <Select
              options={enumOptions(
                POOL_TARGET_TYPES,
                formatMessage,
                'targetType',
              )}
            />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              lifecycleMessageId('fields.targetId'),
              'Target ID',
            )}
            name="targetId"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={formatMessage(lifecycleMessageId('fields.actor'), 'Actor')}
            name="actor"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={formatMessage(lifecycleMessageId('fields.reason'), 'Reason')}
            name="reason"
          >
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        destroyOnClose
        confirmLoading={submitting}
        open={Boolean(assignTarget)}
        title={formatMessage(
          lifecycleMessageId(`modal.${ownerAction}`),
          ownerAction === 'transfer' ? 'Transfer' : 'Assign',
        )}
        onCancel={() => setAssignTarget(undefined)}
        onOk={async () => {
          if (!assignTarget) return;
          const values = await assignForm.validateFields();
          setSubmitting(true);
          try {
            if (ownerAction === 'transfer') {
              await transferOpenCoreBusinessPoolEntry(assignTarget.id, values);
            } else {
              await assignOpenCoreBusinessPoolEntry(assignTarget.id, values);
            }
            message.success(
              formatMessage(
                lifecycleMessageId(
                  ownerAction === 'transfer'
                    ? 'messages.transferred'
                    : 'messages.assigned',
                ),
                ownerAction === 'transfer' ? 'Transferred' : 'Assigned',
              ),
            );
            setAssignTarget(undefined);
            poolActionRef.current?.reload();
            void reloadSummary();
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <Form form={assignForm} layout="vertical">
          <Form.Item
            label={formatMessage(
              lifecycleMessageId('fields.toOwner'),
              'To Owner',
            )}
            name="toOwner"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={formatMessage(lifecycleMessageId('fields.actor'), 'Actor')}
            name="actor"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={formatMessage(lifecycleMessageId('fields.reason'), 'Reason')}
            name="reason"
          >
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        destroyOnClose
        confirmLoading={submitting}
        open={Boolean(stageTarget)}
        title={formatMessage(
          lifecycleMessageId('modal.changeStage'),
          'Change Stage',
        )}
        onCancel={() => setStageTarget(undefined)}
        onOk={async () => {
          if (!stageTarget) return;
          const values = await stageForm.validateFields();
          setSubmitting(true);
          try {
            await changeOpenCoreBusinessCustomerLifecycleStage(
              stageTarget.id,
              values,
            );
            message.success(
              formatMessage(
                lifecycleMessageId('messages.stageChanged'),
                'Changed',
              ),
            );
            setStageTarget(undefined);
            customerActionRef.current?.reload();
            void reloadSummary();
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <Form form={stageForm} layout="vertical">
          <Form.Item
            label={formatMessage(lifecycleMessageId('fields.toStage'), 'Stage')}
            name="toStage"
            rules={[{ required: true }]}
          >
            <Select
              options={enumOptions(LIFECYCLE_STAGES, formatMessage, 'stage')}
            />
          </Form.Item>
          <Form.Item
            label={formatMessage(lifecycleMessageId('fields.actor'), 'Actor')}
            name="actor"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={formatMessage(lifecycleMessageId('fields.reason'), 'Reason')}
            name="reason"
          >
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        destroyOnClose
        open={Boolean(timelineTarget)}
        title={timelineTarget?.name}
        width={520}
        onClose={() => setTimelineTarget(undefined)}
      >
        <List
          dataSource={timeline}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                title={
                  <Space>
                    <Tag color={statusColor(item.eventType)}>
                      {item.eventType}
                    </Tag>
                    <Typography.Text>{item.title}</Typography.Text>
                  </Space>
                }
                description={
                  <Space direction="vertical" size={2}>
                    <Typography.Text type="secondary">
                      {dateText(item.createdAt)}
                    </Typography.Text>
                    {item.actor ? (
                      <Typography.Text type="secondary">
                        {formatMessage(
                          lifecycleMessageId('columns.actor'),
                          'Actor',
                        )}
                        : {item.actor}
                      </Typography.Text>
                    ) : null}
                    {item.fromValue || item.toValue ? (
                      <Typography.Text type="secondary">
                        {item.fromValue ?? '-'} -&gt; {item.toValue ?? '-'}
                      </Typography.Text>
                    ) : null}
                    {item.reason ? (
                      <Typography.Text type="secondary">
                        {item.reason}
                      </Typography.Text>
                    ) : null}
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </Drawer>
    </PageContainer>
  );
}
