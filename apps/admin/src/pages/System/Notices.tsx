import {
  CheckCircleOutlined,
  CheckOutlined,
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  FileTextOutlined,
  InboxOutlined,
  MailOutlined,
  MessageOutlined,
  MoreOutlined,
  PlusOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  SendOutlined,
  StopOutlined,
  SyncOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import type {
  SystemNoticeAudience,
  SystemNoticeDeliveryChannel,
  SystemNoticeDeliverySummary,
  SystemNoticeInboxSummary,
  SystemNoticeReadUserSummary,
  SystemNoticeSummary,
  SystemNoticeTemplateRenderSummary,
  SystemNoticeTemplateSummary,
  SystemNoticeType,
  UserOptionSummary,
} from '@opencore/sdk';
import { useIntl, useLocation, useModel } from '@umijs/max';
import {
  Alert,
  Button,
  DatePicker,
  Dropdown,
  Form,
  Input,
  Modal,
  Popconfirm,
  Segmented,
  Select,
  Space,
  Switch,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { MenuProps } from 'antd';
import { createStyles } from 'antd-style';
import type { Dayjs } from 'dayjs';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import {
  archiveOpenCoreSystemNotice,
  createOpenCoreSystemNoticeFromTemplate,
  createOpenCoreSystemNotice,
  createOpenCoreSystemNoticeTemplate,
  deleteOpenCoreSystemNotice,
  deleteOpenCoreSystemNoticeTemplate,
  dispatchOpenCoreSystemNotice,
  executeOpenCoreSystemNoticeDeliveries,
  getOpenCoreSystemNotice,
  getOpenCoreSystemNoticeInboxItem,
  getOpenCoreSystemNoticeTemplate,
  listOpenCoreUserOptions,
  listOpenCoreSystemNoticeInbox,
  listOpenCoreSystemNoticeDeliveryRecords,
  listOpenCoreSystemNoticeDeliveries,
  listOpenCoreSystemNoticeReadUsers,
  listOpenCoreSystemNoticeTemplates,
  listOpenCoreSystemNotices,
  markOpenCoreIntegrationOutboxFailed,
  markOpenCoreIntegrationOutboxSent,
  markAllOpenCoreSystemNoticesRead,
  markOpenCoreSystemNoticesRead,
  processOpenCoreIntegrationOutbox,
  publishOpenCoreSystemNotice,
  retryOpenCoreIntegrationOutbox,
  renderOpenCoreSystemNoticeTemplate,
  runOpenCoreIntegrationOutboxSchedule,
  testSendOpenCoreSystemNoticeTemplate,
  updateOpenCoreSystemNotice,
  updateOpenCoreSystemNoticeTemplate,
} from '@/services/opencore/platform';
import {
  CurrentPageExportButton,
  type CurrentPageExportColumn,
} from '../shared/CurrentPageExportButton';
import {
  useCurrentPageFilters,
  type CurrentPageFilterOption,
  type CurrentPageSearchField,
} from '../shared/CurrentPageFilters';
import {
  ReadOnlyDetailDrawer,
  type DetailField,
} from '../shared/ReadOnlyDetailDrawer';

const useStyles = createStyles(({ token, css }) => ({
  actionCell: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  `,
  filterCluster: css`
    display: flex;
    flex: 1 1 auto;
    flex-wrap: wrap;
    gap: 8px;
    min-width: 0;

    .ant-space {
      row-gap: 8px !important;
    }

    .ant-space-item {
      max-width: 100%;
    }

    .ant-input-affix-wrapper,
    .ant-select,
    .ant-picker {
      max-width: 100%;
    }

    @media (max-width: ${token.screenMD}px) {
      flex-direction: column;

      .ant-space {
        display: grid;
        width: 100%;
        grid-template-columns: minmax(0, 1fr);
      }

      .ant-space-item,
      .ant-input-affix-wrapper,
      .ant-select,
      .ant-picker {
        width: 100% !important;
      }
    }
  `,
  pageTabs: css`
    .ant-tabs-nav {
      margin-bottom: 16px;
    }

    @media (max-width: ${token.screenMD}px) {
      .ant-tabs-nav-wrap {
        overflow-x: auto;
      }

      .ant-tabs-nav-list {
        min-width: max-content;
      }
    }
  `,
  realtimeStatus: css`
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin-bottom: 12px;
    padding: 10px 12px;
    color: ${token.colorTextSecondary};
    background: ${token.colorFillAlter};
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: ${token.borderRadiusLG}px;
    font-size: 13px;
    line-height: 20px;
  `,
  realtimeStatusIcon: css`
    margin-top: 2px;
    color: ${token.colorSuccess};
  `,
  tableSurface: css`
    max-width: 100%;
    overflow: hidden;

    .ant-pro-card {
      overflow: hidden;
      border-radius: ${token.borderRadiusLG}px;
    }

    .ant-table-wrapper {
      max-width: 100%;
    }

    .ant-table-cell {
      vertical-align: middle;
    }
  `,
  tableToolbar: css`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 12px;
    padding: 16px;
    background: ${token.colorBgContainer};
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: ${token.borderRadiusLG}px;
    box-shadow: ${token.boxShadowTertiary};

    @media (max-width: ${token.screenMD}px) {
      flex-direction: column;
      padding: 12px;
    }
  `,
  toolbarActions: css`
    display: flex;
    flex: 0 0 auto;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;

    @media (max-width: ${token.screenMD}px) {
      width: 100%;
      justify-content: flex-start;

      .ant-btn {
        flex: 1 1 auto;
        min-width: 0;
      }
    }
  `,
}));

type NoticeFormValues = {
  audience: SystemNoticeAudience;
  content: string;
  pinned?: boolean;
  title: string;
  type: SystemNoticeType;
};

type NoticeTemplateFormValues = {
  code: string;
  contentTemplate: string;
  enabled?: boolean;
  name: string;
  remark?: string;
  titleTemplate: string;
  type: SystemNoticeType;
};

type NoticeTemplateRenderFormValues = {
  audience?: SystemNoticeAudience;
  pinned?: boolean;
  recipientUserId?: string;
  templateParams?: Record<string, string>;
};

type ExternalNoticeDeliveryChannel = Extract<
  SystemNoticeDeliveryChannel,
  'mail' | 'sms'
>;

type NoticeTab = 'manage' | 'inbox' | 'templates';
type NoticeManageView = 'notices' | 'deliveryRecords';

const searchFields: CurrentPageSearchField<SystemNoticeSummary>[] = [
  'title',
  'content',
  'createdBy',
  'type',
  'status',
  'audience',
];
const inboxSearchFields: CurrentPageSearchField<SystemNoticeInboxSummary>[] = [
  'title',
  'content',
  'createdBy',
  'type',
  'status',
  'audience',
];
const templateSearchFields: CurrentPageSearchField<SystemNoticeTemplateSummary>[] =
  ['code', 'name', 'type', 'titleTemplate', 'contentTemplate', 'remark'];
const deliverySearchFields: CurrentPageSearchField<SystemNoticeDeliverySummary>[] =
  [
    'title',
    'content',
    'username',
    'displayName',
    'channel',
    'provider',
    'providerStatus',
    'recipient',
    'lastError',
  ];

type DateRangeValue = [Dayjs | null, Dayjs | null] | null;

function getNoticeTabFromSearch(search: string): NoticeTab {
  const tab = new URLSearchParams(search).get('tab');

  if (tab === 'inbox' || tab === 'templates') {
    return tab;
  }

  return 'manage';
}

function getExternalOutboxChannel(
  record: SystemNoticeDeliverySummary,
): ExternalNoticeDeliveryChannel | undefined {
  if (
    (record.channel === 'mail' || record.channel === 'sms') &&
    record.providerMessageId
  ) {
    return record.channel;
  }

  return undefined;
}

function isSchedulableExternalOutboxDelivery(
  record: SystemNoticeDeliverySummary,
): boolean {
  return (
    Boolean(getExternalOutboxChannel(record)) &&
    (record.providerStatus === 'pending' || record.providerStatus === 'failed')
  );
}

function isInDateRange(value: string | undefined, range: DateRangeValue) {
  if (!range?.[0] && !range?.[1]) {
    return true;
  }

  if (!value) {
    return false;
  }

  const time = new Date(value).getTime();
  const start = range?.[0]?.startOf('day').valueOf();
  const end = range?.[1]?.endOf('day').valueOf();

  return (
    (start === undefined || time >= start) && (end === undefined || time <= end)
  );
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export default function SystemNoticesPage() {
  const { styles } = useStyles();
  const intl = useIntl();
  const [form] = Form.useForm<NoticeFormValues>();
  const [templateForm] = Form.useForm<NoticeTemplateFormValues>();
  const [templateRenderForm] = Form.useForm<NoticeTemplateRenderFormValues>();
  const location = useLocation();
  const { initialState } = useModel('@@initialState');
  const [activeTab, setActiveTab] = useState<NoticeTab>(() =>
    getNoticeTabFromSearch(location.search),
  );
  const [manageView, setManageView] = useState<NoticeManageView>('notices');
  const [rows, setRows] = useState<readonly SystemNoticeSummary[]>([]);
  const [inboxRows, setInboxRows] = useState<
    readonly SystemNoticeInboxSummary[]
  >([]);
  const [selectedInboxNoticeIds, setSelectedInboxNoticeIds] = useState<
    string[]
  >([]);
  const [noticeCreatedRange, setNoticeCreatedRange] =
    useState<DateRangeValue>(null);
  const [inboxPublishedRange, setInboxPublishedRange] =
    useState<DateRangeValue>(null);
  const [deliveryDeliveredRange, setDeliveryDeliveredRange] =
    useState<DateRangeValue>(null);
  const [templateCreatedRange, setTemplateCreatedRange] =
    useState<DateRangeValue>(null);
  const [deliveryRecordRows, setDeliveryRecordRows] = useState<
    readonly SystemNoticeDeliverySummary[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [inboxLoading, setInboxLoading] = useState(true);
  const [deliveryRecordsLoading, setDeliveryRecordsLoading] = useState(true);
  const [templates, setTemplates] = useState<
    readonly SystemNoticeTemplateSummary[]
  >([]);
  const [templateLoading, setTemplateLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [inboxLoadError, setInboxLoadError] = useState<string>();
  const [deliveryRecordsLoadError, setDeliveryRecordsLoadError] =
    useState<string>();
  const [templateLoadError, setTemplateLoadError] = useState<string>();
  const [selectedDetail, setSelectedDetail] = useState<SystemNoticeSummary>();
  const [selectedInboxDetail, setSelectedInboxDetail] =
    useState<SystemNoticeInboxSummary>();
  const [selectedTemplateDetail, setSelectedTemplateDetail] =
    useState<SystemNoticeTemplateSummary>();
  const [readUsersOpenFor, setReadUsersOpenFor] =
    useState<SystemNoticeSummary>();
  const [readUsersRows, setReadUsersRows] = useState<
    readonly SystemNoticeReadUserSummary[]
  >([]);
  const [readUsersLoading, setReadUsersLoading] = useState(false);
  const [readUsersLoadError, setReadUsersLoadError] = useState<string>();
  const [deliveriesOpenFor, setDeliveriesOpenFor] =
    useState<SystemNoticeSummary>();
  const [deliveryRows, setDeliveryRows] = useState<
    readonly SystemNoticeDeliverySummary[]
  >([]);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);
  const [deliveriesLoadError, setDeliveriesLoadError] = useState<string>();
  const [editingNotice, setEditingNotice] = useState<SystemNoticeSummary>();
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<SystemNoticeTemplateSummary>();
  const [templateFormOpen, setTemplateFormOpen] = useState(false);
  const [templateSubmitting, setTemplateSubmitting] = useState(false);
  const [renderTemplateFor, setRenderTemplateFor] =
    useState<SystemNoticeTemplateSummary>();
  const [templateRenderPreview, setTemplateRenderPreview] =
    useState<SystemNoticeTemplateRenderSummary>();
  const [templatePreviewLoading, setTemplatePreviewLoading] = useState(false);
  const [templateNoticeSubmitting, setTemplateNoticeSubmitting] =
    useState(false);
  const [templateTestSubmitting, setTemplateTestSubmitting] = useState(false);
  const [userOptions, setUserOptions] = useState<readonly UserOptionSummary[]>(
    [],
  );
  const [userOptionsLoading, setUserOptionsLoading] = useState(false);
  const formatMessage = (
    id: string,
    defaultMessage: string,
    values?: Record<string, number | string>,
  ) =>
    values
      ? intl.formatMessage({ id, defaultMessage }, values)
      : intl.formatMessage({ id, defaultMessage });
  const noticeStatusLabels: Record<SystemNoticeSummary['status'], string> = {
    archived: formatMessage('pages.system.notices.status.archived', 'archived'),
    draft: formatMessage('pages.system.notices.status.draft', 'draft'),
    published: formatMessage(
      'pages.system.notices.status.published',
      'published',
    ),
  };
  const noticeTypeLabels: Record<SystemNoticeType, string> = {
    announcement: formatMessage(
      'pages.system.notices.type.announcement',
      'announcement',
    ),
    maintenance: formatMessage(
      'pages.system.notices.type.maintenance',
      'maintenance',
    ),
    security: formatMessage('pages.system.notices.type.security', 'security'),
  };
  const audienceLabels: Record<SystemNoticeAudience, string> = {
    admin: formatMessage('pages.system.notices.audience.admin', 'admin'),
    all: formatMessage('pages.system.notices.audience.all', 'all'),
  };
  const channelLabels: Record<SystemNoticeDeliveryChannel, string> = {
    in_app: formatMessage('pages.system.notices.channel.inApp', 'in-app'),
    mail: formatMessage('pages.system.notices.channel.mail', 'mail'),
    sms: formatMessage('pages.system.notices.channel.sms', 'sms'),
  };
  const enabledLabels = {
    disabled: formatMessage(
      'pages.system.notices.enabled.disabled',
      'disabled',
    ),
    enabled: formatMessage('pages.system.notices.enabled.enabled', 'enabled'),
  };
  const pinnedLabels = {
    normal: formatMessage('pages.system.notices.pinned.normal', 'normal'),
    pinned: formatMessage('pages.system.notices.pinned.pinned', 'pinned'),
  };
  const readLabels = {
    read: formatMessage('pages.system.notices.read.read', 'read'),
    unread: formatMessage('pages.system.notices.read.unread', 'unread'),
  };
  const deliveryStatusLabels: Record<string, string> = {
    delivered: formatMessage(
      'pages.system.notices.deliveryStatus.delivered',
      'delivered',
    ),
    read: readLabels.read,
    unread: readLabels.unread,
  };
  const providerStatusLabels: Record<string, string> = {
    failed: formatMessage(
      'pages.system.notices.providerStatus.failed',
      'failed',
    ),
    pending: formatMessage(
      'pages.system.notices.providerStatus.pending',
      'pending',
    ),
    sent: formatMessage('pages.system.notices.providerStatus.sent', 'sent'),
  };
  const yesNoLabels = {
    no: formatMessage('pages.system.notices.boolean.no', 'no'),
    yes: formatMessage('pages.system.notices.boolean.yes', 'yes'),
  };
  const labelFrom = (labels: Record<string, string>, value: string): string =>
    labels[value] ?? value;
  const noneLabel = formatMessage('pages.system.notices.empty.none', 'none');
  const noticeTypeOptions = (
    Object.entries(noticeTypeLabels) as Array<[SystemNoticeType, string]>
  ).map(([value, label]) => ({ label, value }));
  const audienceOptions = (
    Object.entries(audienceLabels) as Array<[SystemNoticeAudience, string]>
  ).map(([value, label]) => ({ label, value }));
  const filterOptions: CurrentPageFilterOption<SystemNoticeSummary>[] = [
    {
      key: 'status',
      options: (
        Object.entries(noticeStatusLabels) as Array<
          [SystemNoticeSummary['status'], string]
        >
      ).map(([value, label]) => ({ label, value })),
      placeholder: formatMessage(
        'pages.system.notices.filters.status',
        'Status',
      ),
      predicate: (record, value) => record.status === value,
    },
    {
      key: 'type',
      options: noticeTypeOptions,
      placeholder: formatMessage('pages.system.notices.filters.type', 'Type'),
      predicate: (record, value) => record.type === value,
    },
    {
      key: 'audience',
      options: audienceOptions,
      placeholder: formatMessage(
        'pages.system.notices.filters.audience',
        'Audience',
      ),
      predicate: (record, value) => record.audience === value,
    },
  ];
  const inboxFilterOptions: CurrentPageFilterOption<SystemNoticeInboxSummary>[] =
    [
      {
        key: 'read',
        options: [
          { label: readLabels.unread, value: 'false' },
          { label: readLabels.read, value: 'true' },
        ],
        placeholder: formatMessage(
          'pages.system.notices.filters.readStatus',
          'Read Status',
        ),
        predicate: (record, value) => String(record.read) === value,
      },
      {
        key: 'type',
        options: noticeTypeOptions,
        placeholder: formatMessage('pages.system.notices.filters.type', 'Type'),
        predicate: (record, value) => record.type === value,
      },
    ];
  const templateFilterOptions: CurrentPageFilterOption<SystemNoticeTemplateSummary>[] =
    [
      {
        key: 'type',
        options: noticeTypeOptions,
        placeholder: formatMessage('pages.system.notices.filters.type', 'Type'),
        predicate: (record, value) => record.type === value,
      },
      {
        key: 'enabled',
        options: [
          { label: enabledLabels.enabled, value: 'true' },
          { label: enabledLabels.disabled, value: 'false' },
        ],
        placeholder: formatMessage(
          'pages.system.notices.filters.enabled',
          'Enabled',
        ),
        predicate: (record, value) => String(record.enabled) === value,
      },
    ];
  const deliveryFilterOptions: CurrentPageFilterOption<SystemNoticeDeliverySummary>[] =
    [
      {
        key: 'channel',
        options: (
          Object.entries(channelLabels) as Array<
            [SystemNoticeDeliveryChannel, string]
          >
        ).map(([value, label]) => ({ label, value })),
        placeholder: formatMessage(
          'pages.system.notices.filters.channel',
          'Channel',
        ),
        predicate: (record, value) => record.channel === value,
      },
      {
        key: 'providerStatus',
        options: Object.entries(providerStatusLabels).map(([value, label]) => ({
          label,
          value,
        })),
        placeholder: formatMessage(
          'pages.system.notices.filters.providerStatus',
          'Provider Status',
        ),
        predicate: (record, value) => record.providerStatus === value,
      },
      {
        key: 'read',
        options: [
          { label: readLabels.read, value: 'true' },
          { label: readLabels.unread, value: 'false' },
        ],
        placeholder: formatMessage(
          'pages.system.notices.filters.readStatus',
          'Read Status',
        ),
        predicate: (record, value) => String(Boolean(record.readAt)) === value,
      },
    ];
  const exportColumns: CurrentPageExportColumn<SystemNoticeSummary>[] = [
    {
      title: formatMessage('pages.system.notices.fields.id', 'ID'),
      dataIndex: 'id',
    },
    {
      title: formatMessage('pages.system.notices.fields.title', 'Title'),
      dataIndex: 'title',
    },
    {
      title: formatMessage('pages.system.notices.fields.type', 'Type'),
      renderText: (record) => noticeTypeLabels[record.type],
    },
    {
      title: formatMessage('pages.system.notices.fields.status', 'Status'),
      renderText: (record) => noticeStatusLabels[record.status],
    },
    {
      title: formatMessage('pages.system.notices.fields.audience', 'Audience'),
      renderText: (record) => audienceLabels[record.audience],
    },
    {
      title: formatMessage('pages.system.notices.fields.pinned', 'Pinned'),
      renderText: (record) =>
        record.pinned ? pinnedLabels.pinned : pinnedLabels.normal,
    },
    {
      title: formatMessage(
        'pages.system.notices.fields.createdBy',
        'Created By',
      ),
      dataIndex: 'createdBy',
    },
    {
      title: formatMessage(
        'pages.system.notices.fields.createdAt',
        'Created At',
      ),
      dataIndex: 'createdAt',
    },
    {
      title: formatMessage(
        'pages.system.notices.fields.updatedAt',
        'Updated At',
      ),
      dataIndex: 'updatedAt',
    },
  ];
  const inboxExportColumns: CurrentPageExportColumn<SystemNoticeInboxSummary>[] =
    [
      ...exportColumns,
      {
        title: formatMessage('pages.system.notices.fields.read', 'Read'),
        renderText: (record) =>
          record.read ? readLabels.read : readLabels.unread,
      },
      {
        title: formatMessage('pages.system.notices.fields.readAt', 'Read At'),
        dataIndex: 'readAt',
      },
    ];
  const templateExportColumns: CurrentPageExportColumn<SystemNoticeTemplateSummary>[] =
    [
      {
        title: formatMessage('pages.system.notices.fields.code', 'Code'),
        dataIndex: 'code',
      },
      {
        title: formatMessage('pages.system.notices.fields.name', 'Name'),
        dataIndex: 'name',
      },
      {
        title: formatMessage('pages.system.notices.fields.type', 'Type'),
        renderText: (record) => noticeTypeLabels[record.type],
      },
      {
        title: formatMessage('pages.system.notices.fields.enabled', 'Enabled'),
        renderText: (record) =>
          record.enabled ? enabledLabels.enabled : enabledLabels.disabled,
      },
      {
        title: formatMessage('pages.system.notices.fields.params', 'Params'),
        renderText: (record) => record.params.join(', ') || noneLabel,
      },
      {
        title: formatMessage(
          'pages.system.notices.fields.titleTemplate',
          'Title Template',
        ),
        dataIndex: 'titleTemplate',
      },
      {
        title: formatMessage(
          'pages.system.notices.fields.contentTemplate',
          'Content Template',
        ),
        dataIndex: 'contentTemplate',
      },
      {
        title: formatMessage('pages.system.notices.fields.remark', 'Remark'),
        dataIndex: 'remark',
      },
      {
        title: formatMessage(
          'pages.system.notices.fields.updatedAt',
          'Updated At',
        ),
        dataIndex: 'updatedAt',
      },
    ];
  const deliveryExportColumns: CurrentPageExportColumn<SystemNoticeDeliverySummary>[] =
    [
      {
        title: formatMessage(
          'pages.system.notices.fields.noticeId',
          'Notice ID',
        ),
        dataIndex: 'noticeId',
      },
      {
        title: formatMessage('pages.system.notices.fields.title', 'Title'),
        dataIndex: 'title',
      },
      {
        title: formatMessage(
          'pages.system.notices.fields.username',
          'Username',
        ),
        dataIndex: 'username',
      },
      {
        title: formatMessage('pages.system.notices.fields.channel', 'Channel'),
        renderText: (record) => channelLabels[record.channel],
      },
      {
        title: formatMessage(
          'pages.system.notices.fields.providerStatus',
          'Provider Status',
        ),
        renderText: (record) =>
          labelFrom(providerStatusLabels, record.providerStatus),
      },
      {
        title: formatMessage('pages.system.notices.fields.readAt', 'Read At'),
        dataIndex: 'readAt',
      },
      {
        title: formatMessage(
          'pages.system.notices.fields.deliveredAt',
          'Delivered At',
        ),
        dataIndex: 'deliveredAt',
      },
    ];
  const createDetailFields = (record: SystemNoticeSummary): DetailField[] => [
    {
      label: formatMessage('pages.system.notices.fields.id', 'ID'),
      value: record.id,
    },
    {
      label: formatMessage('pages.system.notices.fields.title', 'Title'),
      value: record.title,
    },
    {
      label: formatMessage('pages.system.notices.fields.type', 'Type'),
      value: noticeTypeLabels[record.type],
    },
    {
      label: formatMessage('pages.system.notices.fields.status', 'Status'),
      value: noticeStatusLabels[record.status],
    },
    {
      label: formatMessage('pages.system.notices.fields.audience', 'Audience'),
      value: audienceLabels[record.audience],
    },
    {
      label: formatMessage('pages.system.notices.fields.pinned', 'Pinned'),
      value: record.pinned ? yesNoLabels.yes : yesNoLabels.no,
    },
    {
      label: formatMessage(
        'pages.system.notices.fields.validFrom',
        'Valid From',
      ),
      value: record.validFrom,
    },
    {
      label: formatMessage('pages.system.notices.fields.validTo', 'Valid To'),
      value: record.validTo,
    },
    {
      label: formatMessage(
        'pages.system.notices.fields.publishedAt',
        'Published At',
      ),
      value: record.publishedAt,
    },
    {
      label: formatMessage(
        'pages.system.notices.fields.archivedAt',
        'Archived At',
      ),
      value: record.archivedAt,
    },
    {
      label: formatMessage(
        'pages.system.notices.fields.createdBy',
        'Created By',
      ),
      value: record.createdBy,
    },
    {
      label: formatMessage(
        'pages.system.notices.fields.createdAt',
        'Created At',
      ),
      value: record.createdAt,
    },
    {
      label: formatMessage(
        'pages.system.notices.fields.updatedAt',
        'Updated At',
      ),
      value: record.updatedAt,
    },
    {
      label: formatMessage('pages.system.notices.fields.content', 'Content'),
      value: record.content,
    },
  ];
  const createInboxDetailFields = (
    record: SystemNoticeInboxSummary,
  ): DetailField[] => [
    ...createDetailFields(record),
    {
      label: formatMessage('pages.system.notices.fields.read', 'Read'),
      value: record.read ? yesNoLabels.yes : yesNoLabels.no,
    },
    {
      label: formatMessage('pages.system.notices.fields.readAt', 'Read At'),
      value: record.readAt,
    },
  ];
  const createTemplateDetailFields = (
    record: SystemNoticeTemplateSummary,
  ): DetailField[] => [
    {
      label: formatMessage('pages.system.notices.fields.id', 'ID'),
      value: record.id,
    },
    {
      label: formatMessage('pages.system.notices.fields.code', 'Code'),
      value: record.code,
    },
    {
      label: formatMessage('pages.system.notices.fields.name', 'Name'),
      value: record.name,
    },
    {
      label: formatMessage('pages.system.notices.fields.type', 'Type'),
      value: noticeTypeLabels[record.type],
    },
    {
      label: formatMessage('pages.system.notices.fields.enabled', 'Enabled'),
      value: record.enabled ? yesNoLabels.yes : yesNoLabels.no,
    },
    {
      label: formatMessage('pages.system.notices.fields.params', 'Params'),
      value: record.params.join(', ') || noneLabel,
    },
    {
      label: formatMessage(
        'pages.system.notices.fields.titleTemplate',
        'Title Template',
      ),
      value: record.titleTemplate,
    },
    {
      label: formatMessage(
        'pages.system.notices.fields.contentTemplate',
        'Content Template',
      ),
      value: record.contentTemplate,
    },
    {
      label: formatMessage('pages.system.notices.fields.remark', 'Remark'),
      value: record.remark,
    },
    {
      label: formatMessage(
        'pages.system.notices.fields.createdAt',
        'Created At',
      ),
      value: record.createdAt,
    },
    {
      label: formatMessage(
        'pages.system.notices.fields.updatedAt',
        'Updated At',
      ),
      value: record.updatedAt,
    },
  ];
  const renderStatus = (status: SystemNoticeSummary['status']) => {
    const color =
      status === 'published'
        ? 'green'
        : status === 'draft'
          ? 'gold'
          : 'default';
    return <Tag color={color}>{noticeStatusLabels[status]}</Tag>;
  };
  const renderType = (type: SystemNoticeSummary['type']) => {
    const color =
      type === 'security' ? 'red' : type === 'maintenance' ? 'blue' : 'purple';
    return <Tag color={color}>{noticeTypeLabels[type]}</Tag>;
  };
  const dateFilteredRows = rows.filter((record) =>
    isInDateRange(record.createdAt, noticeCreatedRange),
  );
  const dateFilteredInboxRows = inboxRows.filter((record) =>
    isInDateRange(record.publishedAt ?? record.createdAt, inboxPublishedRange),
  );
  const dateFilteredDeliveryRows = deliveryRecordRows.filter((record) =>
    isInDateRange(record.deliveredAt, deliveryDeliveredRange),
  );
  const dateFilteredTemplates = templates.filter((record) =>
    isInDateRange(record.createdAt, templateCreatedRange),
  );
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<SystemNoticeSummary>({
      rows: dateFilteredRows,
      searchFields,
      searchPlaceholder: formatMessage(
        'pages.system.notices.search.placeholder',
        'Search system notices',
      ),
      selectFilters: filterOptions,
    });
  const { filteredRows: filteredInboxRows, toolbar: inboxFilterToolbar } =
    useCurrentPageFilters<SystemNoticeInboxSummary>({
      rows: dateFilteredInboxRows,
      searchFields: inboxSearchFields,
      searchPlaceholder: formatMessage(
        'pages.system.notices.inbox.searchPlaceholder',
        'Search inbox notices',
      ),
      selectFilters: inboxFilterOptions,
    });
  const { filteredRows: filteredTemplates, toolbar: templateFilterToolbar } =
    useCurrentPageFilters<SystemNoticeTemplateSummary>({
      rows: dateFilteredTemplates,
      searchFields: templateSearchFields,
      searchPlaceholder: formatMessage(
        'pages.system.notices.templates.searchPlaceholder',
        'Search system notice templates',
      ),
      selectFilters: templateFilterOptions,
    });
  const {
    filteredRows: filteredDeliveryRecords,
    toolbar: deliveryRecordFilterToolbar,
  } = useCurrentPageFilters<SystemNoticeDeliverySummary>({
    rows: dateFilteredDeliveryRows,
    searchFields: deliverySearchFields,
    searchPlaceholder: formatMessage(
      'pages.system.notices.deliveries.searchPlaceholder',
      'Search delivery records',
    ),
    selectFilters: deliveryFilterOptions,
  });

  const loadNotices = async () => {
    setLoading(true);
    try {
      const notices = await listOpenCoreSystemNotices({
        page: 1,
        pageSize: 100,
      });
      setRows(notices);
      setLoadError(undefined);
    } catch (error: unknown) {
      setRows([]);
      setSelectedDetail(undefined);
      setReadUsersOpenFor(undefined);
      setReadUsersRows([]);
      setReadUsersLoadError(undefined);
      setDeliveriesOpenFor(undefined);
      setDeliveryRows([]);
      setDeliveriesLoadError(undefined);
      setEditingNotice(undefined);
      setFormOpen(false);
      setLoadError(
        getErrorMessage(
          error,
          formatMessage(
            'pages.system.notices.load.failure',
            'Unable to load live system notices.',
          ),
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const loadInbox = async () => {
    setInboxLoading(true);
    try {
      const notices = await listOpenCoreSystemNoticeInbox({
        page: 1,
        pageSize: 100,
      });
      setInboxRows(notices);
      setSelectedInboxNoticeIds((ids) =>
        ids.filter((id) =>
          notices.some((notice) => notice.id === id && !notice.read),
        ),
      );
      setInboxLoadError(undefined);
    } catch (error: unknown) {
      setInboxRows([]);
      setSelectedInboxNoticeIds([]);
      setInboxLoadError(
        getErrorMessage(
          error,
          formatMessage(
            'pages.system.notices.inbox.loadFailure',
            'Unable to load live system notice inbox.',
          ),
        ),
      );
    } finally {
      setInboxLoading(false);
    }
  };

  const loadDeliveryRecords = async () => {
    setDeliveryRecordsLoading(true);
    try {
      const deliveries = await listOpenCoreSystemNoticeDeliveryRecords({
        page: 1,
        pageSize: 100,
      });
      setDeliveryRecordRows(deliveries);
      setDeliveryRecordsLoadError(undefined);
    } catch (error: unknown) {
      setDeliveryRecordRows([]);
      setDeliveryRecordsLoadError(
        getErrorMessage(
          error,
          formatMessage(
            'pages.system.notices.deliveries.loadFailure',
            'Unable to load live system notice delivery records.',
          ),
        ),
      );
    } finally {
      setDeliveryRecordsLoading(false);
    }
  };

  const loadTemplates = async () => {
    setTemplateLoading(true);
    try {
      const noticeTemplates = await listOpenCoreSystemNoticeTemplates({
        page: 1,
        pageSize: 100,
      });
      setTemplates(noticeTemplates);
      setTemplateLoadError(undefined);
    } catch (error: unknown) {
      setTemplates([]);
      setSelectedTemplateDetail(undefined);
      setEditingTemplate(undefined);
      setTemplateFormOpen(false);
      setRenderTemplateFor(undefined);
      setTemplateRenderPreview(undefined);
      setTemplateLoadError(
        getErrorMessage(
          error,
          formatMessage(
            'pages.system.notices.templates.loadFailure',
            'Unable to load live system notice templates.',
          ),
        ),
      );
    } finally {
      setTemplateLoading(false);
    }
  };

  const loadUserOptions = async () => {
    setUserOptionsLoading(true);
    try {
      setUserOptions(await listOpenCoreUserOptions());
    } catch (_error: unknown) {
      setUserOptions([]);
    } finally {
      setUserOptionsLoading(false);
    }
  };

  useEffect(() => {
    void loadNotices();
    void loadInbox();
    void loadDeliveryRecords();
    void loadTemplates();
  }, []);

  useEffect(() => {
    setActiveTab(getNoticeTabFromSearch(location.search));
  }, [location.search]);

  const openCreateForm = () => {
    setEditingNotice(undefined);
    form.setFieldsValue({
      audience: 'all',
      content: '',
      pinned: false,
      title: '',
      type: 'announcement',
    });
    setFormOpen(true);
  };

  const openEditForm = async (record: SystemNoticeSummary) => {
    try {
      const fresh = await getOpenCoreSystemNotice(record.id);
      setEditingNotice(fresh);
      form.setFieldsValue({
        audience: fresh.audience,
        content: fresh.content,
        pinned: fresh.pinned,
        title: fresh.title,
        type: fresh.type,
      });
      setFormOpen(true);
    } catch (error: unknown) {
      message.error(
        getErrorMessage(
          error,
          formatMessage(
            'pages.system.notices.open.failure',
            'Unable to open live system notice.',
          ),
        ),
      );
    }
  };

  const openCreateTemplateForm = () => {
    setEditingTemplate(undefined);
    templateForm.setFieldsValue({
      code: '',
      contentTemplate: '',
      enabled: true,
      name: '',
      remark: '',
      titleTemplate: '',
      type: 'announcement',
    });
    setTemplateFormOpen(true);
  };

  const openEditTemplateForm = async (record: SystemNoticeTemplateSummary) => {
    try {
      const fresh = await getOpenCoreSystemNoticeTemplate(record.code);
      setEditingTemplate(fresh);
      templateForm.setFieldsValue({
        code: fresh.code,
        contentTemplate: fresh.contentTemplate,
        enabled: fresh.enabled,
        name: fresh.name,
        remark: fresh.remark,
        titleTemplate: fresh.titleTemplate,
        type: fresh.type,
      });
      setTemplateFormOpen(true);
    } catch (error: unknown) {
      message.error(
        getErrorMessage(
          error,
          formatMessage(
            'pages.system.notices.templates.openFailure',
            'Unable to open live system notice template.',
          ),
        ),
      );
    }
  };

  const openDetail = async (record: SystemNoticeSummary) => {
    try {
      setSelectedDetail(await getOpenCoreSystemNotice(record.id));
    } catch (error: unknown) {
      setSelectedDetail(undefined);
      message.error(
        getErrorMessage(
          error,
          formatMessage(
            'pages.system.notices.detail.loadFailure',
            'Unable to load live system notice detail.',
          ),
        ),
      );
    }
  };

  const openTemplateDetail = async (record: SystemNoticeTemplateSummary) => {
    try {
      setSelectedTemplateDetail(
        await getOpenCoreSystemNoticeTemplate(record.code),
      );
    } catch (error: unknown) {
      setSelectedTemplateDetail(undefined);
      message.error(
        getErrorMessage(
          error,
          formatMessage(
            'pages.system.notices.templates.detailLoadFailure',
            'Unable to load live system notice template detail.',
          ),
        ),
      );
    }
  };

  const openTemplateRender = async (record: SystemNoticeTemplateSummary) => {
    try {
      const fresh = await getOpenCoreSystemNoticeTemplate(record.code);
      setRenderTemplateFor(fresh);
      setTemplateRenderPreview(undefined);
      templateRenderForm.setFieldsValue({
        audience: 'admin',
        pinned: false,
        recipientUserId: initialState?.currentUser?.id,
        templateParams: Object.fromEntries(
          fresh.params.map((param) => [param, '']),
        ),
      });
      void loadUserOptions();
    } catch (error: unknown) {
      message.error(
        getErrorMessage(
          error,
          formatMessage(
            'pages.system.notices.templates.previewOpenFailure',
            'Unable to open live system notice template render preview.',
          ),
        ),
      );
    }
  };

  const openReadUsers = async (record: SystemNoticeSummary) => {
    setReadUsersOpenFor(record);
    setReadUsersRows([]);
    setReadUsersLoadError(undefined);
    setReadUsersLoading(true);
    try {
      const users = await listOpenCoreSystemNoticeReadUsers(record.id, {
        page: 1,
        pageSize: 100,
      });
      setReadUsersRows(users);
      setReadUsersLoadError(undefined);
    } catch (error: unknown) {
      setReadUsersRows([]);
      setReadUsersLoadError(
        getErrorMessage(
          error,
          formatMessage(
            'pages.system.notices.readUsers.loadFailure',
            'Unable to load live system notice read users.',
          ),
        ),
      );
    } finally {
      setReadUsersLoading(false);
    }
  };

  const openDeliveryRecords = async (record: SystemNoticeSummary) => {
    setDeliveriesOpenFor(record);
    setDeliveryRows([]);
    setDeliveriesLoadError(undefined);
    setDeliveriesLoading(true);
    try {
      const deliveries = await listOpenCoreSystemNoticeDeliveries(record.id, {
        page: 1,
        pageSize: 100,
      });
      setDeliveryRows(deliveries);
      setDeliveriesLoadError(undefined);
    } catch (error: unknown) {
      setDeliveryRows([]);
      setDeliveriesLoadError(
        getErrorMessage(
          error,
          formatMessage(
            'pages.system.notices.deliveries.loadFailure',
            'Unable to load live system notice delivery records.',
          ),
        ),
      );
    } finally {
      setDeliveriesLoading(false);
    }
  };

  const openDeliveryRecordNotice = async (
    record: SystemNoticeDeliverySummary,
  ) => {
    try {
      const notice = await getOpenCoreSystemNotice(record.noticeId);
      await openDeliveryRecords(notice);
    } catch (error: unknown) {
      message.error(
        getErrorMessage(
          error,
          formatMessage(
            'pages.system.notices.open.failure',
            'Unable to open live system notice.',
          ),
        ),
      );
    }
  };

  const submitForm = async () => {
    const values = await form.validateFields();
    const createdBy = initialState?.currentUser?.username ?? 'admin';

    setSubmitting(true);
    try {
      if (editingNotice) {
        await updateOpenCoreSystemNotice(editingNotice.id, values);
        message.success(
          formatMessage(
            'pages.system.notices.messages.updated',
            'System notice updated.',
          ),
        );
      } else {
        await createOpenCoreSystemNotice({
          ...values,
          createdBy,
        });
        message.success(
          formatMessage(
            'pages.system.notices.messages.created',
            'System notice created.',
          ),
        );
      }
      setFormOpen(false);
      setEditingNotice(undefined);
      await loadNotices();
      await loadInbox();
      await loadDeliveryRecords();
    } finally {
      setSubmitting(false);
    }
  };

  const submitTemplateForm = async () => {
    const values = await templateForm.validateFields();

    setTemplateSubmitting(true);
    try {
      if (editingTemplate) {
        await updateOpenCoreSystemNoticeTemplate(editingTemplate.code, {
          contentTemplate: values.contentTemplate,
          enabled: values.enabled,
          name: values.name,
          remark: values.remark,
          titleTemplate: values.titleTemplate,
          type: values.type,
        });
        message.success(
          formatMessage(
            'pages.system.notices.templates.messages.updated',
            'System notice template updated.',
          ),
        );
      } else {
        await createOpenCoreSystemNoticeTemplate(values);
        message.success(
          formatMessage(
            'pages.system.notices.templates.messages.created',
            'System notice template created.',
          ),
        );
      }
      setTemplateFormOpen(false);
      setEditingTemplate(undefined);
      await loadTemplates();
    } finally {
      setTemplateSubmitting(false);
    }
  };

  const renderTemplatePreview = async () => {
    if (!renderTemplateFor) {
      return;
    }
    const values = await templateRenderForm.validateFields();

    setTemplatePreviewLoading(true);
    try {
      const preview = await renderOpenCoreSystemNoticeTemplate(
        renderTemplateFor.code,
        {
          templateParams: values.templateParams ?? {},
        },
      );
      setTemplateRenderPreview(preview);
    } finally {
      setTemplatePreviewLoading(false);
    }
  };

  const createDraftFromTemplate = async () => {
    if (!renderTemplateFor) {
      return;
    }
    const values = await templateRenderForm.validateFields();
    const createdBy = initialState?.currentUser?.username ?? 'admin';

    setTemplateNoticeSubmitting(true);
    try {
      await createOpenCoreSystemNoticeFromTemplate(renderTemplateFor.code, {
        audience: values.audience ?? 'admin',
        createdBy,
        pinned: values.pinned,
        templateParams: values.templateParams ?? {},
      });
      message.success(
        formatMessage(
          'pages.system.notices.templates.messages.draftCreated',
          'Draft notice created from template.',
        ),
      );
      setRenderTemplateFor(undefined);
      setTemplateRenderPreview(undefined);
      await loadNotices();
      await loadInbox();
      await loadDeliveryRecords();
    } finally {
      setTemplateNoticeSubmitting(false);
    }
  };

  const testSendTemplate = async () => {
    if (!renderTemplateFor) {
      return;
    }
    const values = await templateRenderForm.validateFields();

    if (!values.recipientUserId) {
      templateRenderForm.setFields([
        {
          name: 'recipientUserId',
          errors: [
            formatMessage(
              'pages.system.notices.validation.recipientRequired',
              'Recipient is required.',
            ),
          ],
        },
      ]);
      return;
    }

    const createdBy = initialState?.currentUser?.username ?? 'admin';

    setTemplateTestSubmitting(true);
    try {
      await testSendOpenCoreSystemNoticeTemplate(renderTemplateFor.code, {
        createdBy,
        recipientUserId: values.recipientUserId,
        templateParams: values.templateParams ?? {},
      });
      message.success(
        formatMessage(
          'pages.system.notices.templates.messages.testSent',
          'Test notice sent.',
        ),
      );
      setRenderTemplateFor(undefined);
      setTemplateRenderPreview(undefined);
      await loadNotices();
      await loadInbox();
      await loadDeliveryRecords();
    } finally {
      setTemplateTestSubmitting(false);
    }
  };

  const publishNotice = async (record: SystemNoticeSummary) => {
    await publishOpenCoreSystemNotice(record.id);
    message.success(
      formatMessage(
        'pages.system.notices.messages.published',
        'System notice published and in-app deliveries created.',
      ),
    );
    await loadNotices();
    await loadInbox();
    await loadDeliveryRecords();
  };

  const dispatchNoticeDeliveries = async (
    record: SystemNoticeSummary,
    channel: SystemNoticeDeliveryChannel,
  ) => {
    const result = await dispatchOpenCoreSystemNotice(record.id, channel);
    message.success(
      formatMessage(
        'pages.system.notices.messages.deliveryDispatched',
        '{channel} delivery dispatched: {deliveredCount} new, {skippedCount} skipped.',
        {
          channel: channelLabels[result.channel],
          deliveredCount: result.deliveredCount,
          skippedCount: result.skippedCount,
        },
      ),
    );
    await loadInbox();
    await loadDeliveryRecords();

    if (deliveriesOpenFor?.id === record.id) {
      await openDeliveryRecords(record);
    }
  };

  const executeNoticeDeliveries = async (
    record: SystemNoticeSummary,
    channel: SystemNoticeDeliveryChannel,
  ) => {
    const result = await executeOpenCoreSystemNoticeDeliveries(
      record.id,
      channel,
    );
    message.success(
      formatMessage(
        'pages.system.notices.messages.deliveryExecuted',
        '{provider} executed: {sentCount} sent, {pendingCount} pending, {queuedCount} queued.',
        {
          pendingCount: result.pendingCount,
          provider: result.provider,
          queuedCount: result.queuedOutboxCount,
          sentCount: result.sentCount,
        },
      ),
    );
    await loadInbox();
    await loadDeliveryRecords();

    if (deliveriesOpenFor?.id === record.id) {
      await openDeliveryRecords(record);
    }
  };

  const refreshOpenDeliveries = async () => {
    if (deliveriesOpenFor) {
      await openDeliveryRecords(deliveriesOpenFor);
    }
  };

  const refreshDeliverySurfaces = async () => {
    await loadDeliveryRecords();
    await refreshOpenDeliveries();
  };

  const failDeliveryOutbox = async (record: SystemNoticeDeliverySummary) => {
    const channel = getExternalOutboxChannel(record);
    if (!channel || !record.providerMessageId) {
      return;
    }

    await markOpenCoreIntegrationOutboxFailed(
      channel,
      record.providerMessageId,
      {
        error: 'Operator marked provider failure from Admin.',
      },
    );
    message.success(
      formatMessage(
        'pages.system.notices.outbox.messages.failed',
        '{channel} outbox marked failed.',
        { channel: channelLabels[channel] },
      ),
    );
    await refreshDeliverySurfaces();
  };

  const retryDeliveryOutbox = async (record: SystemNoticeDeliverySummary) => {
    const channel = getExternalOutboxChannel(record);
    if (!channel || !record.providerMessageId) {
      return;
    }

    await retryOpenCoreIntegrationOutbox(channel, record.providerMessageId);
    message.success(
      formatMessage(
        'pages.system.notices.outbox.messages.retryQueued',
        '{channel} outbox queued for retry.',
        { channel: channelLabels[channel] },
      ),
    );
    await refreshDeliverySurfaces();
  };

  const markDeliveryOutboxSent = async (
    record: SystemNoticeDeliverySummary,
  ) => {
    const channel = getExternalOutboxChannel(record);
    if (!channel || !record.providerMessageId) {
      return;
    }

    await markOpenCoreIntegrationOutboxSent(channel, record.providerMessageId);
    message.success(
      formatMessage(
        'pages.system.notices.outbox.messages.sent',
        '{channel} outbox marked sent.',
        { channel: channelLabels[channel] },
      ),
    );
    await refreshDeliverySurfaces();
  };

  const processDeliveryOutbox = async (record: SystemNoticeDeliverySummary) => {
    const channel = getExternalOutboxChannel(record);
    if (!channel || !record.providerMessageId) {
      return;
    }

    const result = await processOpenCoreIntegrationOutbox(channel, {
      providerCode: record.provider,
    });
    message.success(
      formatMessage(
        'pages.system.notices.outbox.messages.processed',
        '{channel} outbox processed: {sentCount} sent, {failedCount} failed, {queuedCount} queued.',
        {
          channel: channelLabels[channel],
          failedCount: result.failedCount,
          queuedCount: result.queuedCount,
          sentCount: result.sentCount,
        },
      ),
    );
    await refreshDeliverySurfaces();
  };

  const runDeliveryOutboxSchedule = async () => {
    const result = await runOpenCoreIntegrationOutboxSchedule({
      channels: ['mail', 'sms'],
      retryFailed: true,
      maxRetryCount: 3,
      limit: 100,
    });
    message.success(
      formatMessage(
        'pages.system.notices.outbox.messages.scheduleRun',
        'Outbox schedule run: {retriedCount} retried, {sentCount} sent, {failedCount} failed, {queuedCount} queued.',
        {
          failedCount: result.failedCount,
          queuedCount: result.queuedCount,
          retriedCount: result.retriedCount,
          sentCount: result.sentCount,
        },
      ),
    );
    await loadInbox();
    await refreshDeliverySurfaces();
  };

  const archiveNotice = async (record: SystemNoticeSummary) => {
    await archiveOpenCoreSystemNotice(record.id);
    message.success(
      formatMessage(
        'pages.system.notices.messages.archived',
        'System notice archived.',
      ),
    );
    await loadNotices();
    await loadInbox();
    await loadDeliveryRecords();
  };

  const deleteNotice = async (record: SystemNoticeSummary) => {
    await deleteOpenCoreSystemNotice(record.id);
    message.success(
      formatMessage(
        'pages.system.notices.messages.deleted',
        'System notice deleted.',
      ),
    );
    await loadNotices();
    await loadInbox();
    await loadDeliveryRecords();
  };

  const deleteTemplate = async (record: SystemNoticeTemplateSummary) => {
    await deleteOpenCoreSystemNoticeTemplate(record.code);
    message.success(
      formatMessage(
        'pages.system.notices.templates.messages.deleted',
        'System notice template deleted.',
      ),
    );
    await loadTemplates();
  };

  const openInboxDetail = async (record: SystemNoticeInboxSummary) => {
    try {
      if (!record.read) {
        await markOpenCoreSystemNoticesRead({ ids: [record.id] });
      }
      setSelectedInboxDetail(await getOpenCoreSystemNoticeInboxItem(record.id));
      if (!record.read) {
        await loadInbox();
        await loadDeliveryRecords();
      }
    } catch (error: unknown) {
      setSelectedInboxDetail(undefined);
      message.error(
        getErrorMessage(
          error,
          formatMessage(
            'pages.system.notices.inbox.detailLoadFailure',
            'Unable to load live system notice inbox detail.',
          ),
        ),
      );
    }
  };

  const markInboxNoticeRead = async (record: SystemNoticeInboxSummary) => {
    await markOpenCoreSystemNoticesRead({ ids: [record.id] });
    message.success(
      formatMessage(
        'pages.system.notices.inbox.messages.markedRead',
        'System notice marked read.',
      ),
    );
    await loadInbox();
    await loadDeliveryRecords();
  };

  const markSelectedInboxNoticesRead = async () => {
    if (selectedInboxNoticeIds.length === 0) {
      return;
    }

    await markOpenCoreSystemNoticesRead({ ids: selectedInboxNoticeIds });
    message.success(
      formatMessage(
        'pages.system.notices.inbox.messages.selectedMarkedRead',
        'Selected system notices marked read.',
      ),
    );
    setSelectedInboxNoticeIds([]);
    await loadInbox();
    await loadDeliveryRecords();
  };

  const markAllInboxNoticesRead = async () => {
    await markAllOpenCoreSystemNoticesRead();
    message.success(
      formatMessage(
        'pages.system.notices.inbox.messages.allMarkedRead',
        'All system notices marked read.',
      ),
    );
    setSelectedInboxNoticeIds([]);
    await loadInbox();
    await loadDeliveryRecords();
  };

  const renderTableToolbar = ({
    actions,
    filters,
    range,
  }: {
    actions: ReactNode;
    filters: ReactNode;
    range?: ReactNode;
  }) => (
    <div className={styles.tableToolbar}>
      <div className={styles.filterCluster}>
        {filters}
        {range}
      </div>
      <div className={styles.toolbarActions}>{actions}</div>
    </div>
  );

  const confirmNoticeAction = ({
    action,
    danger,
    okText,
    title,
  }: {
    action: () => Promise<void>;
    danger?: boolean;
    okText: string;
    title: string;
  }) => {
    Modal.confirm({
      title,
      okText,
      cancelText: formatMessage(
        'pages.system.notices.actions.cancel',
        'Cancel',
      ),
      okButtonProps: danger ? { danger: true } : undefined,
      onOk: action,
    });
  };

  const renderNoticeActions = (record: SystemNoticeSummary) => {
    const archived = record.status === 'archived';
    const draft = record.status === 'draft';
    const published = record.status === 'published';
    const moreItems = [
      {
        key: 'readUsers',
        icon: <TeamOutlined />,
        label: formatMessage(
          'pages.system.notices.actions.readUsers',
          'Read users',
        ),
      },
      {
        key: 'deliveryRecords',
        icon: <InboxOutlined />,
        label: formatMessage(
          'pages.system.notices.actions.deliveryRecords',
          'Delivery records',
        ),
      },
      { type: 'divider' as const },
      draft
        ? {
            key: 'publish',
            icon: <SendOutlined />,
            label: formatMessage(
              'pages.system.notices.actions.publish',
              'Publish',
            ),
          }
        : undefined,
      published
        ? {
            key: 'dispatchInApp',
            icon: <SendOutlined />,
            label: formatMessage(
              'pages.system.notices.actions.dispatchInApp',
              'Dispatch in-app deliveries',
            ),
          }
        : undefined,
      published
        ? {
            key: 'dispatchMail',
            icon: <MailOutlined />,
            label: formatMessage(
              'pages.system.notices.actions.dispatchMail',
              'Dispatch mail deliveries',
            ),
          }
        : undefined,
      published
        ? {
            key: 'dispatchSms',
            icon: <MessageOutlined />,
            label: formatMessage(
              'pages.system.notices.actions.dispatchSms',
              'Dispatch SMS deliveries',
            ),
          }
        : undefined,
      published
        ? {
            key: 'executeLocal',
            icon: <PlayCircleOutlined />,
            label: formatMessage(
              'pages.system.notices.actions.executeLocal',
              'Execute local provider',
            ),
          }
        : undefined,
      published
        ? {
            key: 'executeMail',
            icon: <MailOutlined />,
            label: formatMessage(
              'pages.system.notices.actions.executeMail',
              'Execute mail outbox provider',
            ),
          }
        : undefined,
      published
        ? {
            key: 'executeSms',
            icon: <MessageOutlined />,
            label: formatMessage(
              'pages.system.notices.actions.executeSms',
              'Execute SMS outbox provider',
            ),
          }
        : undefined,
      !archived
        ? {
            key: 'archive',
            icon: <StopOutlined />,
            label: formatMessage(
              'pages.system.notices.actions.archive',
              'Archive',
            ),
          }
        : undefined,
      {
        danger: true,
        key: 'delete',
        icon: <DeleteOutlined />,
        label: formatMessage('pages.system.notices.actions.delete', 'Delete'),
      },
    ].filter(Boolean) as MenuProps['items'];

    const onMoreAction: MenuProps['onClick'] = ({ key }) => {
      switch (key) {
        case 'readUsers':
          void openReadUsers(record);
          break;
        case 'deliveryRecords':
          void openDeliveryRecords(record);
          break;
        case 'publish':
          confirmNoticeAction({
            title: formatMessage(
              'pages.system.notices.confirm.publish',
              'Publish this notice?',
            ),
            okText: formatMessage(
              'pages.system.notices.actions.publish',
              'Publish',
            ),
            action: () => publishNotice(record),
          });
          break;
        case 'dispatchInApp':
          confirmNoticeAction({
            title: formatMessage(
              'pages.system.notices.confirm.dispatchInApp',
              'Dispatch in-app delivery records?',
            ),
            okText: formatMessage(
              'pages.system.notices.actions.dispatch',
              'Dispatch',
            ),
            action: () => dispatchNoticeDeliveries(record, 'in_app'),
          });
          break;
        case 'dispatchMail':
          confirmNoticeAction({
            title: formatMessage(
              'pages.system.notices.confirm.dispatchMail',
              'Dispatch mail delivery records?',
            ),
            okText: formatMessage(
              'pages.system.notices.actions.dispatch',
              'Dispatch',
            ),
            action: () => dispatchNoticeDeliveries(record, 'mail'),
          });
          break;
        case 'dispatchSms':
          confirmNoticeAction({
            title: formatMessage(
              'pages.system.notices.confirm.dispatchSms',
              'Dispatch SMS delivery records?',
            ),
            okText: formatMessage(
              'pages.system.notices.actions.dispatch',
              'Dispatch',
            ),
            action: () => dispatchNoticeDeliveries(record, 'sms'),
          });
          break;
        case 'executeLocal':
          confirmNoticeAction({
            title: formatMessage(
              'pages.system.notices.confirm.executeLocal',
              'Execute local notice provider?',
            ),
            okText: formatMessage(
              'pages.system.notices.actions.execute',
              'Execute',
            ),
            action: () => executeNoticeDeliveries(record, 'in_app'),
          });
          break;
        case 'executeMail':
          confirmNoticeAction({
            title: formatMessage(
              'pages.system.notices.confirm.executeMail',
              'Execute mail outbox provider?',
            ),
            okText: formatMessage(
              'pages.system.notices.actions.execute',
              'Execute',
            ),
            action: () => executeNoticeDeliveries(record, 'mail'),
          });
          break;
        case 'executeSms':
          confirmNoticeAction({
            title: formatMessage(
              'pages.system.notices.confirm.executeSms',
              'Execute SMS outbox provider?',
            ),
            okText: formatMessage(
              'pages.system.notices.actions.execute',
              'Execute',
            ),
            action: () => executeNoticeDeliveries(record, 'sms'),
          });
          break;
        case 'archive':
          confirmNoticeAction({
            title: formatMessage(
              'pages.system.notices.confirm.archive',
              'Archive this notice?',
            ),
            okText: formatMessage(
              'pages.system.notices.actions.archive',
              'Archive',
            ),
            action: () => archiveNotice(record),
          });
          break;
        case 'delete':
          confirmNoticeAction({
            title: formatMessage(
              'pages.system.notices.confirm.deleteOne',
              'Delete this notice?',
            ),
            okText: formatMessage(
              'pages.system.notices.actions.delete',
              'Delete',
            ),
            danger: true,
            action: () => deleteNotice(record),
          });
          break;
        default:
          break;
      }
    };

    return (
      <div className={styles.actionCell}>
        <Tooltip
          title={formatMessage('pages.system.notices.actions.detail', 'Detail')}
        >
          <Button
            aria-label={formatMessage(
              'pages.system.notices.actions.viewAria',
              'View {title}',
              { title: record.title },
            )}
            icon={<EyeOutlined />}
            onClick={() => void openDetail(record)}
            size="small"
          />
        </Tooltip>
        <Tooltip
          title={
            archived
              ? formatMessage(
                  'pages.system.notices.actions.archivedEditLocked',
                  'Archived notices cannot be edited',
                )
              : formatMessage('pages.system.notices.actions.edit', 'Edit')
          }
        >
          <Button
            aria-label={formatMessage(
              'pages.system.notices.actions.editAria',
              'Edit {title}',
              { title: record.title },
            )}
            disabled={archived}
            icon={<EditOutlined />}
            onClick={() => void openEditForm(record)}
            size="small"
          />
        </Tooltip>
        <Dropdown
          menu={{ items: moreItems, onClick: onMoreAction }}
          trigger={['click']}
        >
          <Button
            aria-label={formatMessage(
              'pages.system.notices.actions.moreAria',
              'More actions for {title}',
              { title: record.title },
            )}
            icon={<MoreOutlined />}
            size="small"
          >
            {formatMessage('pages.system.notices.actions.more', 'More')}
          </Button>
        </Dropdown>
      </div>
    );
  };

  const columns: ProColumns<SystemNoticeSummary>[] = [
    {
      title: formatMessage('pages.system.notices.fields.title', 'Title'),
      dataIndex: 'title',
      render: (_, record) => (
        <Typography.Link onClick={() => void openDetail(record)}>
          {record.title}
        </Typography.Link>
      ),
    },
    {
      title: formatMessage('pages.system.notices.fields.type', 'Type'),
      dataIndex: 'type',
      render: (_, record) => renderType(record.type),
    },
    {
      title: formatMessage('pages.system.notices.fields.status', 'Status'),
      dataIndex: 'status',
      render: (_, record) => renderStatus(record.status),
    },
    {
      title: formatMessage('pages.system.notices.fields.audience', 'Audience'),
      dataIndex: 'audience',
      render: (_, record) => <Tag>{audienceLabels[record.audience]}</Tag>,
    },
    {
      title: formatMessage('pages.system.notices.fields.pinned', 'Pinned'),
      dataIndex: 'pinned',
      render: (_, record) => (
        <Tag color={record.pinned ? 'blue' : 'default'}>
          {record.pinned ? pinnedLabels.pinned : pinnedLabels.normal}
        </Tag>
      ),
    },
    {
      title: formatMessage(
        'pages.system.notices.fields.createdBy',
        'Created By',
      ),
      dataIndex: 'createdBy',
    },
    {
      title: formatMessage('pages.system.notices.actions.column', 'Actions'),
      valueType: 'option',
      width: 180,
      render: (_, record) => renderNoticeActions(record),
    },
  ];

  const readUserColumns: ProColumns<SystemNoticeReadUserSummary>[] = [
    {
      title: formatMessage('pages.system.notices.fields.username', 'Username'),
      dataIndex: 'username',
    },
    {
      title: formatMessage(
        'pages.system.notices.fields.displayName',
        'Display Name',
      ),
      dataIndex: 'displayName',
    },
    {
      title: formatMessage('pages.system.notices.fields.readAt', 'Read At'),
      dataIndex: 'readAt',
    },
  ];

  const deliveryColumns: ProColumns<SystemNoticeDeliverySummary>[] = [
    {
      title: formatMessage('pages.system.notices.fields.username', 'Username'),
      dataIndex: 'username',
    },
    {
      title: formatMessage(
        'pages.system.notices.fields.displayName',
        'Display Name',
      ),
      dataIndex: 'displayName',
    },
    {
      title: formatMessage('pages.system.notices.fields.channel', 'Channel'),
      dataIndex: 'channel',
      render: (_, record) => <Tag>{channelLabels[record.channel]}</Tag>,
    },
    {
      title: formatMessage('pages.system.notices.fields.status', 'Status'),
      dataIndex: 'status',
      render: (_, record) => (
        <Tag color={record.status === 'read' ? 'default' : 'blue'}>
          {labelFrom(deliveryStatusLabels, record.status)}
        </Tag>
      ),
    },
    {
      title: formatMessage('pages.system.notices.fields.provider', 'Provider'),
      dataIndex: 'provider',
      render: (_, record) => <Tag>{record.provider}</Tag>,
    },
    {
      title: formatMessage(
        'pages.system.notices.fields.recipient',
        'Recipient',
      ),
      dataIndex: 'recipient',
    },
    {
      title: formatMessage(
        'pages.system.notices.fields.providerStatus',
        'Provider Status',
      ),
      dataIndex: 'providerStatus',
      render: (_, record) => (
        <Tag
          color={
            record.providerStatus === 'sent'
              ? 'green'
              : record.providerStatus === 'failed'
                ? 'red'
                : 'gold'
          }
        >
          {labelFrom(providerStatusLabels, record.providerStatus)}
        </Tag>
      ),
    },
    {
      title: formatMessage('pages.system.notices.fields.attempts', 'Attempts'),
      dataIndex: 'attemptCount',
    },
    {
      title: formatMessage(
        'pages.system.notices.fields.deliveredAt',
        'Delivered At',
      ),
      dataIndex: 'deliveredAt',
    },
    {
      title: formatMessage(
        'pages.system.notices.fields.lastAttemptAt',
        'Last Attempt At',
      ),
      dataIndex: 'lastAttemptAt',
    },
    {
      title: formatMessage('pages.system.notices.fields.sentAt', 'Sent At'),
      dataIndex: 'sentAt',
    },
    {
      title: formatMessage(
        'pages.system.notices.fields.providerMessage',
        'Provider Message',
      ),
      dataIndex: 'providerMessageId',
    },
    {
      title: formatMessage(
        'pages.system.notices.fields.lastError',
        'Last Error',
      ),
      dataIndex: 'lastError',
    },
    {
      title: formatMessage('pages.system.notices.fields.readAt', 'Read At'),
      dataIndex: 'readAt',
    },
    {
      title: formatMessage(
        'pages.system.notices.outbox.actions.column',
        'Outbox Actions',
      ),
      valueType: 'option',
      width: 150,
      render: (_, record) => {
        const channel = getExternalOutboxChannel(record);
        const sent = record.providerStatus === 'sent';
        const failed = record.providerStatus === 'failed';
        const queued = record.providerStatus === 'pending';

        return (
          <Space size="small">
            <Tooltip
              title={
                !channel
                  ? formatMessage(
                      'pages.system.notices.outbox.actions.mailSmsOnlyProcess',
                      'Only mail/SMS outbox deliveries can be processed',
                    )
                  : queued
                    ? formatMessage(
                        'pages.system.notices.outbox.actions.processQueued',
                        'Process queued outbox',
                      )
                    : failed
                      ? formatMessage(
                          'pages.system.notices.outbox.actions.retryFailedFirst',
                          'Retry failed outbox first',
                        )
                      : formatMessage(
                          'pages.system.notices.outbox.actions.alreadySent',
                          'Already sent',
                        )
              }
            >
              <Button
                aria-label={formatMessage(
                  'pages.system.notices.outbox.actions.processAria',
                  'Process queued outbox {id}',
                  { id: record.providerMessageId ?? record.id },
                )}
                disabled={!channel || !queued}
                icon={<PlayCircleOutlined />}
                onClick={() => void processDeliveryOutbox(record)}
                size="small"
              />
            </Tooltip>
            <Popconfirm
              title={formatMessage(
                'pages.system.notices.outbox.confirm.fail',
                'Fail outbox?',
              )}
              okText={formatMessage(
                'pages.system.notices.outbox.actions.fail',
                'Fail outbox',
              )}
              okButtonProps={{ danger: true }}
              disabled={!channel || sent}
              onConfirm={() => void failDeliveryOutbox(record)}
            >
              <Tooltip
                title={
                  !channel
                    ? formatMessage(
                        'pages.system.notices.outbox.actions.mailSmsOnlyFail',
                        'Only mail/SMS outbox deliveries can fail',
                      )
                    : sent
                      ? formatMessage(
                          'pages.system.notices.outbox.actions.sentCannotFail',
                          'Sent outbox messages cannot fail',
                        )
                      : formatMessage(
                          'pages.system.notices.outbox.actions.fail',
                          'Fail outbox',
                        )
                }
              >
                <Button
                  aria-label={formatMessage(
                    'pages.system.notices.outbox.actions.failAria',
                    'Fail outbox {id}',
                    { id: record.providerMessageId ?? record.id },
                  )}
                  danger
                  disabled={!channel || sent}
                  icon={<ExclamationCircleOutlined />}
                  size="small"
                />
              </Tooltip>
            </Popconfirm>
            <Tooltip
              title={
                !channel
                  ? formatMessage(
                      'pages.system.notices.outbox.actions.mailSmsOnlyRetry',
                      'Only mail/SMS outbox deliveries can retry',
                    )
                  : failed
                    ? formatMessage(
                        'pages.system.notices.outbox.actions.retry',
                        'Retry outbox',
                      )
                    : formatMessage(
                        'pages.system.notices.outbox.actions.failedOnlyRetry',
                        'Only failed outbox messages can retry',
                      )
              }
            >
              <Button
                aria-label={formatMessage(
                  'pages.system.notices.outbox.actions.retryAria',
                  'Retry outbox {id}',
                  { id: record.providerMessageId ?? record.id },
                )}
                disabled={!channel || !failed}
                icon={<SyncOutlined />}
                onClick={() => void retryDeliveryOutbox(record)}
                size="small"
              />
            </Tooltip>
            <Popconfirm
              title={formatMessage(
                'pages.system.notices.outbox.confirm.markSent',
                'Mark outbox sent?',
              )}
              okText={formatMessage(
                'pages.system.notices.outbox.actions.markSent',
                'Mark outbox sent',
              )}
              disabled={!channel || sent}
              onConfirm={() => void markDeliveryOutboxSent(record)}
            >
              <Tooltip
                title={
                  !channel
                    ? formatMessage(
                        'pages.system.notices.outbox.actions.mailSmsOnlyMarkSent',
                        'Only mail/SMS outbox deliveries can be marked sent',
                      )
                    : sent
                      ? formatMessage(
                          'pages.system.notices.outbox.actions.alreadySent',
                          'Already sent',
                        )
                      : formatMessage(
                          'pages.system.notices.outbox.actions.markSent',
                          'Mark outbox sent',
                        )
                }
              >
                <Button
                  aria-label={formatMessage(
                    'pages.system.notices.outbox.actions.markSentAria',
                    'Mark outbox sent {id}',
                    { id: record.providerMessageId ?? record.id },
                  )}
                  disabled={!channel || sent}
                  icon={<CheckCircleOutlined />}
                  size="small"
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const deliveryRecordColumns: ProColumns<SystemNoticeDeliverySummary>[] = [
    {
      title: formatMessage('pages.system.notices.fields.title', 'Title'),
      dataIndex: 'title',
      render: (_, record) => (
        <Typography.Link onClick={() => void openDeliveryRecordNotice(record)}>
          {record.title}
        </Typography.Link>
      ),
    },
    {
      title: formatMessage('pages.system.notices.fields.noticeId', 'Notice ID'),
      dataIndex: 'noticeId',
      ellipsis: true,
    },
    ...deliveryColumns,
  ];

  const inboxColumns: ProColumns<SystemNoticeInboxSummary>[] = [
    {
      title: formatMessage('pages.system.notices.fields.title', 'Title'),
      dataIndex: 'title',
      render: (_, record) => (
        <Typography.Link onClick={() => void openInboxDetail(record)}>
          {record.title}
        </Typography.Link>
      ),
    },
    {
      title: formatMessage('pages.system.notices.fields.type', 'Type'),
      dataIndex: 'type',
      render: (_, record) => renderType(record.type),
    },
    {
      title: formatMessage('pages.system.notices.fields.read', 'Read'),
      dataIndex: 'read',
      render: (_, record) => (
        <Tag color={record.read ? 'default' : 'red'}>
          {record.read ? readLabels.read : readLabels.unread}
        </Tag>
      ),
    },
    {
      title: formatMessage('pages.system.notices.fields.pinned', 'Pinned'),
      dataIndex: 'pinned',
      render: (_, record) => (
        <Tag color={record.pinned ? 'blue' : 'default'}>
          {record.pinned ? pinnedLabels.pinned : pinnedLabels.normal}
        </Tag>
      ),
    },
    {
      title: formatMessage(
        'pages.system.notices.fields.publishedAt',
        'Published At',
      ),
      dataIndex: 'publishedAt',
    },
    {
      title: formatMessage('pages.system.notices.actions.column', 'Actions'),
      valueType: 'option',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Tooltip
            title={formatMessage(
              'pages.system.notices.actions.detail',
              'Detail',
            )}
          >
            <Button
              aria-label={formatMessage(
                'pages.system.notices.inbox.actions.viewAria',
                'View inbox notice {title}',
                { title: record.title },
              )}
              icon={<EyeOutlined />}
              onClick={() => void openInboxDetail(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip
            title={
              record.read
                ? formatMessage(
                    'pages.system.notices.inbox.actions.alreadyRead',
                    'Already read',
                  )
                : formatMessage(
                    'pages.system.notices.inbox.actions.markRead',
                    'Mark read',
                  )
            }
          >
            <Button
              aria-label={formatMessage(
                'pages.system.notices.inbox.actions.markReadAria',
                'Mark {title} read',
                { title: record.title },
              )}
              disabled={record.read}
              icon={<CheckOutlined />}
              onClick={() => void markInboxNoticeRead(record)}
              size="small"
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const templateColumns: ProColumns<SystemNoticeTemplateSummary>[] = [
    {
      title: formatMessage('pages.system.notices.fields.name', 'Name'),
      dataIndex: 'name',
      render: (_, record) => (
        <Typography.Link onClick={() => void openTemplateDetail(record)}>
          {record.name}
        </Typography.Link>
      ),
    },
    {
      title: formatMessage('pages.system.notices.fields.code', 'Code'),
      dataIndex: 'code',
    },
    {
      title: formatMessage('pages.system.notices.fields.type', 'Type'),
      dataIndex: 'type',
      render: (_, record) => renderType(record.type),
    },
    {
      title: formatMessage('pages.system.notices.fields.enabled', 'Enabled'),
      dataIndex: 'enabled',
      render: (_, record) => (
        <Tag color={record.enabled ? 'green' : 'default'}>
          {record.enabled ? enabledLabels.enabled : enabledLabels.disabled}
        </Tag>
      ),
    },
    {
      title: formatMessage('pages.system.notices.fields.params', 'Params'),
      dataIndex: 'params',
      render: (_, record) => (
        <Space size={[0, 4]} wrap>
          {record.params.length > 0 ? (
            record.params.map((param) => <Tag key={param}>{param}</Tag>)
          ) : (
            <Tag>{noneLabel}</Tag>
          )}
        </Space>
      ),
    },
    {
      title: formatMessage(
        'pages.system.notices.fields.updatedAt',
        'Updated At',
      ),
      dataIndex: 'updatedAt',
    },
    {
      title: formatMessage('pages.system.notices.actions.column', 'Actions'),
      valueType: 'option',
      width: 240,
      render: (_, record) => (
        <Space size="small">
          <Tooltip
            title={formatMessage(
              'pages.system.notices.actions.detail',
              'Detail',
            )}
          >
            <Button
              aria-label={formatMessage(
                'pages.system.notices.templates.actions.viewAria',
                'View template {name}',
                { name: record.name },
              )}
              icon={<EyeOutlined />}
              onClick={() => void openTemplateDetail(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip
            title={formatMessage('pages.system.notices.actions.edit', 'Edit')}
          >
            <Button
              aria-label={formatMessage(
                'pages.system.notices.templates.actions.editAria',
                'Edit template {name}',
                { name: record.name },
              )}
              icon={<EditOutlined />}
              onClick={() => void openEditTemplateForm(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip
            title={
              record.enabled
                ? formatMessage(
                    'pages.system.notices.templates.actions.renderPreview',
                    'Notice template render preview',
                  )
                : formatMessage(
                    'pages.system.notices.templates.actions.disabledRenderLocked',
                    'Disabled templates cannot render',
                  )
            }
          >
            <Button
              aria-label={formatMessage(
                'pages.system.notices.templates.actions.renderAria',
                'Render template {name}',
                { name: record.name },
              )}
              disabled={!record.enabled}
              icon={<PlayCircleOutlined />}
              onClick={() => void openTemplateRender(record)}
              size="small"
            />
          </Tooltip>
          <Popconfirm
            title={formatMessage(
              'pages.system.notices.templates.confirm.deleteOne',
              'Delete this notice template?',
            )}
            okText={formatMessage(
              'pages.system.notices.actions.delete',
              'Delete',
            )}
            okButtonProps={{ danger: true }}
            onConfirm={() => void deleteTemplate(record)}
          >
            <Tooltip
              title={formatMessage(
                'pages.system.notices.actions.delete',
                'Delete',
              )}
            >
              <Button
                aria-label={formatMessage(
                  'pages.system.notices.templates.actions.deleteAria',
                  'Delete template {name}',
                  { name: record.name },
                )}
                danger
                icon={<DeleteOutlined />}
                size="small"
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];
  const hasOpenSchedulableExternalOutbox = deliveryRows.some(
    isSchedulableExternalOutboxDelivery,
  );
  const hasDeliveryRecordSchedulableExternalOutbox = deliveryRecordRows.some(
    isSchedulableExternalOutboxDelivery,
  );

  return (
    <PageContainer
      title={formatMessage('pages.system.notices.title', 'System Notices')}
      subTitle={formatMessage('pages.system.notices.section', 'S7 System')}
    >
      <Tabs
        activeKey={activeTab}
        className={styles.pageTabs}
        onChange={(key) => setActiveTab(key as NoticeTab)}
        items={[
          {
            key: 'manage',
            label: formatMessage('pages.system.notices.tabs.manage', 'Manage'),
            children: (
              <>
                <Segmented<NoticeManageView>
                  value={manageView}
                  onChange={(value) => setManageView(value)}
                  options={[
                    {
                      label: formatMessage(
                        'pages.system.notices.manageViews.notices',
                        'Notices',
                      ),
                      value: 'notices',
                    },
                    {
                      label: formatMessage(
                        'pages.system.notices.manageViews.deliveryRecords',
                        'Delivery Records',
                      ),
                      value: 'deliveryRecords',
                    },
                  ]}
                  style={{ marginBlockEnd: 16 }}
                />
                {manageView === 'notices' ? (
                  <>
                    {loadError ? (
                      <Alert
                        showIcon
                        type="error"
                        message={formatMessage(
                          'pages.system.notices.load.liveFailure',
                          'Unable to load live system notices',
                        )}
                        description={loadError}
                        style={{ marginBlockEnd: 16 }}
                      />
                    ) : null}
                    {renderTableToolbar({
                      filters: filterToolbar,
                      range: (
                        <DatePicker.RangePicker
                          onChange={(dates) =>
                            setNoticeCreatedRange(dates as DateRangeValue)
                          }
                          placeholder={[
                            formatMessage(
                              'pages.system.notices.filters.createdFrom',
                              'Created From',
                            ),
                            formatMessage(
                              'pages.system.notices.filters.createdTo',
                              'Created To',
                            ),
                          ]}
                        />
                      ),
                      actions: (
                        <>
                          <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={openCreateForm}
                          >
                            {formatMessage(
                              'pages.system.notices.actions.new',
                              'New',
                            )}
                          </Button>
                          <Button
                            icon={<ReloadOutlined />}
                            onClick={() => void loadNotices()}
                          >
                            {formatMessage(
                              'pages.system.notices.actions.refresh',
                              'Refresh',
                            )}
                          </Button>
                          <CurrentPageExportButton<SystemNoticeSummary>
                            columns={exportColumns}
                            resource="core-notices"
                            rows={filteredRows}
                          />
                        </>
                      ),
                    })}
                    <div className={styles.tableSurface}>
                      <ProTable<SystemNoticeSummary>
                        rowKey="id"
                        loading={loading}
                        search={false}
                        options={false}
                        toolBarRender={false}
                        pagination={{
                          pageSize: 10,
                        }}
                        scroll={{ x: 920 }}
                        dataSource={filteredRows}
                        columns={columns}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {deliveryRecordsLoadError ? (
                      <Alert
                        showIcon
                        type="error"
                        message={formatMessage(
                          'pages.system.notices.deliveries.loadLiveFailure',
                          'Unable to load live system notice delivery records',
                        )}
                        description={deliveryRecordsLoadError}
                        style={{ marginBlockEnd: 16 }}
                      />
                    ) : null}
                    {renderTableToolbar({
                      filters: deliveryRecordFilterToolbar,
                      range: (
                        <DatePicker.RangePicker
                          onChange={(dates) =>
                            setDeliveryDeliveredRange(dates as DateRangeValue)
                          }
                          placeholder={[
                            formatMessage(
                              'pages.system.notices.filters.deliveredFrom',
                              'Delivered From',
                            ),
                            formatMessage(
                              'pages.system.notices.filters.deliveredTo',
                              'Delivered To',
                            ),
                          ]}
                        />
                      ),
                      actions: (
                        <>
                          <Button
                            icon={<SyncOutlined />}
                            disabled={
                              !hasDeliveryRecordSchedulableExternalOutbox
                            }
                            onClick={() => void runDeliveryOutboxSchedule()}
                          >
                            {formatMessage(
                              'pages.system.notices.outbox.actions.runSchedule',
                              'Run outbox schedule',
                            )}
                          </Button>
                          <Button
                            icon={<ReloadOutlined />}
                            onClick={() => void loadDeliveryRecords()}
                          >
                            {formatMessage(
                              'pages.system.notices.actions.refresh',
                              'Refresh',
                            )}
                          </Button>
                          <CurrentPageExportButton<SystemNoticeDeliverySummary>
                            columns={deliveryExportColumns}
                            resource="core-notice-deliveries"
                            rows={filteredDeliveryRecords}
                          />
                        </>
                      ),
                    })}
                    <div className={styles.tableSurface}>
                      <ProTable<SystemNoticeDeliverySummary>
                        rowKey="id"
                        loading={deliveryRecordsLoading}
                        search={false}
                        options={false}
                        toolBarRender={false}
                        pagination={{
                          pageSize: 10,
                        }}
                        scroll={{ x: 1480 }}
                        dataSource={filteredDeliveryRecords}
                        columns={deliveryRecordColumns}
                      />
                    </div>
                  </>
                )}
              </>
            ),
          },
          {
            key: 'inbox',
            label: formatMessage(
              'pages.system.notices.tabs.inbox',
              'Inbox ({count})',
              { count: inboxRows.filter((record) => !record.read).length },
            ),
            children: (
              <>
                <div className={styles.realtimeStatus}>
                  <CheckCircleOutlined className={styles.realtimeStatusIcon} />
                  <span>
                    <Typography.Text strong>
                      {formatMessage(
                        'pages.system.notices.inbox.realtimeStream',
                        'Realtime sync enabled',
                      )}
                    </Typography.Text>
                    <br />
                    <Typography.Text type="secondary">
                      {formatMessage(
                        'pages.system.notices.inbox.realtimeDescription',
                        'New notices and read status changes are synchronized automatically.',
                      )}
                    </Typography.Text>
                  </span>
                </div>
                {inboxLoadError ? (
                  <Alert
                    showIcon
                    type="error"
                    message={formatMessage(
                      'pages.system.notices.inbox.loadLiveFailure',
                      'Unable to load live system notice inbox',
                    )}
                    description={inboxLoadError}
                    style={{ marginBlockEnd: 16 }}
                  />
                ) : null}
                {renderTableToolbar({
                  filters: inboxFilterToolbar,
                  range: (
                    <DatePicker.RangePicker
                      onChange={(dates) =>
                        setInboxPublishedRange(dates as DateRangeValue)
                      }
                      placeholder={[
                        formatMessage(
                          'pages.system.notices.filters.publishedFrom',
                          'Published From',
                        ),
                        formatMessage(
                          'pages.system.notices.filters.publishedTo',
                          'Published To',
                        ),
                      ]}
                    />
                  ),
                  actions: (
                    <>
                      <Button
                        icon={<CheckOutlined />}
                        onClick={() => void markSelectedInboxNoticesRead()}
                        disabled={selectedInboxNoticeIds.length === 0}
                      >
                        {formatMessage(
                          'pages.system.notices.inbox.actions.markSelectedRead',
                          'Mark selected read',
                        )}
                      </Button>
                      <Button
                        icon={<CheckOutlined />}
                        onClick={() => void markAllInboxNoticesRead()}
                        disabled={inboxRows.every((record) => record.read)}
                      >
                        {formatMessage(
                          'pages.system.notices.inbox.actions.markAllRead',
                          'Mark all read',
                        )}
                      </Button>
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={() => void loadInbox()}
                      >
                        {formatMessage(
                          'pages.system.notices.actions.refresh',
                          'Refresh',
                        )}
                      </Button>
                      <CurrentPageExportButton<SystemNoticeInboxSummary>
                        columns={inboxExportColumns}
                        resource="core-notice-inbox"
                        rows={filteredInboxRows}
                      />
                    </>
                  ),
                })}
                <div className={styles.tableSurface}>
                  <ProTable<SystemNoticeInboxSummary>
                    rowKey="id"
                    loading={inboxLoading}
                    search={false}
                    options={false}
                    rowSelection={{
                      selectedRowKeys: selectedInboxNoticeIds,
                      onChange: (keys) =>
                        setSelectedInboxNoticeIds(keys.map(String)),
                      getCheckboxProps: (record) => ({
                        disabled: record.read,
                      }),
                    }}
                    toolBarRender={false}
                    pagination={{
                      pageSize: 10,
                    }}
                    scroll={{ x: 980 }}
                    dataSource={filteredInboxRows}
                    columns={inboxColumns}
                  />
                </div>
              </>
            ),
          },
          {
            key: 'templates',
            label: formatMessage(
              'pages.system.notices.tabs.templates',
              'System Notice Templates',
            ),
            children: (
              <>
                {templateLoadError ? (
                  <Alert
                    showIcon
                    type="error"
                    message={formatMessage(
                      'pages.system.notices.templates.loadLiveFailure',
                      'Unable to load live system notice templates',
                    )}
                    description={templateLoadError}
                    style={{ marginBlockEnd: 16 }}
                  />
                ) : null}
                {renderTableToolbar({
                  filters: templateFilterToolbar,
                  range: (
                    <DatePicker.RangePicker
                      onChange={(dates) =>
                        setTemplateCreatedRange(dates as DateRangeValue)
                      }
                      placeholder={[
                        formatMessage(
                          'pages.system.notices.filters.createdFrom',
                          'Created From',
                        ),
                        formatMessage(
                          'pages.system.notices.filters.createdTo',
                          'Created To',
                        ),
                      ]}
                    />
                  ),
                  actions: (
                    <>
                      <Button
                        type="primary"
                        icon={<FileTextOutlined />}
                        onClick={openCreateTemplateForm}
                      >
                        {formatMessage(
                          'pages.system.notices.templates.actions.new',
                          'New Template',
                        )}
                      </Button>
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={() => void loadTemplates()}
                      >
                        {formatMessage(
                          'pages.system.notices.actions.refresh',
                          'Refresh',
                        )}
                      </Button>
                      <CurrentPageExportButton<SystemNoticeTemplateSummary>
                        columns={templateExportColumns}
                        resource="core-notice-templates"
                        rows={filteredTemplates}
                      />
                    </>
                  ),
                })}
                <div className={styles.tableSurface}>
                  <ProTable<SystemNoticeTemplateSummary>
                    rowKey="code"
                    loading={templateLoading}
                    search={false}
                    options={false}
                    toolBarRender={false}
                    pagination={{
                      pageSize: 10,
                    }}
                    scroll={{ x: 920 }}
                    dataSource={filteredTemplates}
                    columns={templateColumns}
                  />
                </div>
              </>
            ),
          },
        ]}
      />
      <ReadOnlyDetailDrawer
        fields={selectedDetail ? createDetailFields(selectedDetail) : []}
        onClose={() => setSelectedDetail(undefined)}
        open={Boolean(selectedDetail)}
        title={
          selectedDetail?.title ??
          formatMessage(
            'pages.system.notices.detail.title',
            'System Notice Detail',
          )
        }
      />
      <ReadOnlyDetailDrawer
        fields={
          selectedInboxDetail
            ? createInboxDetailFields(selectedInboxDetail)
            : []
        }
        onClose={() => setSelectedInboxDetail(undefined)}
        open={Boolean(selectedInboxDetail)}
        title={
          selectedInboxDetail?.title ??
          formatMessage(
            'pages.system.notices.inbox.detailTitle',
            'System Notice Inbox Detail',
          )
        }
      />
      <ReadOnlyDetailDrawer
        fields={
          selectedTemplateDetail
            ? createTemplateDetailFields(selectedTemplateDetail)
            : []
        }
        onClose={() => setSelectedTemplateDetail(undefined)}
        open={Boolean(selectedTemplateDetail)}
        title={
          selectedTemplateDetail?.name ??
          formatMessage(
            'pages.system.notices.templates.detailTitle',
            'System Notice Template Detail',
          )
        }
      />
      <Modal
        title={
          readUsersOpenFor
            ? formatMessage(
                'pages.system.notices.readUsers.titleForNotice',
                'System Notice Read Users: {title}',
                { title: readUsersOpenFor.title },
              )
            : formatMessage(
                'pages.system.notices.readUsers.title',
                'System Notice Read Users',
              )
        }
        open={Boolean(readUsersOpenFor)}
        onCancel={() => {
          setReadUsersOpenFor(undefined);
          setReadUsersRows([]);
          setReadUsersLoadError(undefined);
        }}
        footer={null}
        width={720}
        destroyOnHidden
      >
        {readUsersLoadError ? (
          <Alert
            showIcon
            type="error"
            message={formatMessage(
              'pages.system.notices.readUsers.loadLiveFailure',
              'Unable to load live system notice read users',
            )}
            description={readUsersLoadError}
            style={{ marginBlockEnd: 16 }}
          />
        ) : null}
        <ProTable<SystemNoticeReadUserSummary>
          rowKey="userId"
          loading={readUsersLoading}
          search={false}
          options={false}
          toolBarRender={false}
          pagination={{ pageSize: 10 }}
          dataSource={[...readUsersRows]}
          columns={readUserColumns}
        />
      </Modal>
      <Modal
        title={
          deliveriesOpenFor
            ? formatMessage(
                'pages.system.notices.deliveries.titleForNotice',
                'System Notice Delivery Records: {title}',
                { title: deliveriesOpenFor.title },
              )
            : formatMessage(
                'pages.system.notices.deliveries.title',
                'System Notice Delivery Records',
              )
        }
        open={Boolean(deliveriesOpenFor)}
        onCancel={() => {
          setDeliveriesOpenFor(undefined);
          setDeliveryRows([]);
          setDeliveriesLoadError(undefined);
        }}
        footer={null}
        width={860}
        destroyOnHidden
      >
        {deliveriesLoadError ? (
          <Alert
            showIcon
            type="error"
            message={formatMessage(
              'pages.system.notices.deliveries.loadLiveFailure',
              'Unable to load live system notice delivery records',
            )}
            description={deliveriesLoadError}
            style={{ marginBlockEnd: 16 }}
          />
        ) : null}
        <ProTable<SystemNoticeDeliverySummary>
          rowKey="id"
          loading={deliveriesLoading}
          search={false}
          options={false}
          toolBarRender={() => [
            <Button
              key="schedule"
              icon={<SyncOutlined />}
              disabled={!hasOpenSchedulableExternalOutbox}
              onClick={() => void runDeliveryOutboxSchedule()}
            >
              {formatMessage(
                'pages.system.notices.outbox.actions.runSchedule',
                'Run outbox schedule',
              )}
            </Button>,
            <Button
              key="refresh"
              icon={<ReloadOutlined />}
              onClick={() => void refreshOpenDeliveries()}
            >
              {formatMessage('pages.system.notices.actions.refresh', 'Refresh')}
            </Button>,
          ]}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1280 }}
          dataSource={[...deliveryRows]}
          columns={deliveryColumns}
        />
      </Modal>
      <Modal
        title={formatMessage(
          editingNotice
            ? 'pages.system.notices.form.editTitle'
            : 'pages.system.notices.form.createTitle',
          editingNotice ? 'Edit System Notice' : 'New System Notice',
        )}
        open={formOpen}
        onCancel={() => {
          setFormOpen(false);
          setEditingNotice(undefined);
        }}
        onOk={() => void submitForm()}
        confirmLoading={submitting}
        okText={
          editingNotice
            ? formatMessage('pages.system.notices.actions.save', 'Save')
            : formatMessage('pages.system.notices.actions.create', 'Create')
        }
      >
        <Form<NoticeFormValues> form={form} layout="vertical">
          <Form.Item
            label={formatMessage('pages.system.notices.fields.title', 'Title')}
            name="title"
            rules={[
              {
                required: true,
                message: formatMessage(
                  'pages.system.notices.validation.titleRequired',
                  'Title is required.',
                ),
              },
            ]}
          >
            <Input maxLength={80} />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              'pages.system.notices.fields.content',
              'Content',
            )}
            name="content"
            rules={[
              {
                required: true,
                message: formatMessage(
                  'pages.system.notices.validation.contentRequired',
                  'Content is required.',
                ),
              },
            ]}
          >
            <Input.TextArea rows={5} maxLength={2000} />
          </Form.Item>
          <Space align="start" size="middle" wrap>
            <Form.Item
              label={formatMessage('pages.system.notices.fields.type', 'Type')}
              name="type"
              rules={[
                {
                  required: true,
                  message: formatMessage(
                    'pages.system.notices.validation.typeRequired',
                    'Type is required.',
                  ),
                },
              ]}
            >
              <Select style={{ width: 180 }} options={noticeTypeOptions} />
            </Form.Item>
            <Form.Item
              label={formatMessage(
                'pages.system.notices.fields.audience',
                'Audience',
              )}
              name="audience"
              rules={[
                {
                  required: true,
                  message: formatMessage(
                    'pages.system.notices.validation.audienceRequired',
                    'Audience is required.',
                  ),
                },
              ]}
            >
              <Select style={{ width: 160 }} options={audienceOptions} />
            </Form.Item>
            <Form.Item
              label={formatMessage(
                'pages.system.notices.fields.pinned',
                'Pinned',
              )}
              name="pinned"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
      <Modal
        title={formatMessage(
          editingTemplate
            ? 'pages.system.notices.templates.form.editTitle'
            : 'pages.system.notices.templates.form.createTitle',
          editingTemplate
            ? 'Edit System Notice Template'
            : 'New System Notice Template',
        )}
        open={templateFormOpen}
        onCancel={() => {
          setTemplateFormOpen(false);
          setEditingTemplate(undefined);
        }}
        onOk={() => void submitTemplateForm()}
        confirmLoading={templateSubmitting}
        okText={
          editingTemplate
            ? formatMessage('pages.system.notices.actions.save', 'Save')
            : formatMessage('pages.system.notices.actions.create', 'Create')
        }
        width={720}
      >
        <Form<NoticeTemplateFormValues> form={templateForm} layout="vertical">
          <Space align="start" size="middle" wrap>
            <Form.Item
              label={formatMessage('pages.system.notices.fields.code', 'Code')}
              name="code"
              rules={[
                {
                  required: true,
                  message: formatMessage(
                    'pages.system.notices.validation.codeRequired',
                    'Code is required.',
                  ),
                },
              ]}
            >
              <Input
                disabled={Boolean(editingTemplate)}
                maxLength={80}
                placeholder={formatMessage(
                  'pages.system.notices.templates.placeholders.code',
                  'release.window',
                )}
                style={{ width: 220 }}
              />
            </Form.Item>
            <Form.Item
              label={formatMessage('pages.system.notices.fields.name', 'Name')}
              name="name"
              rules={[
                {
                  required: true,
                  message: formatMessage(
                    'pages.system.notices.validation.nameRequired',
                    'Name is required.',
                  ),
                },
              ]}
            >
              <Input maxLength={80} style={{ width: 220 }} />
            </Form.Item>
            <Form.Item
              label={formatMessage('pages.system.notices.fields.type', 'Type')}
              name="type"
              rules={[
                {
                  required: true,
                  message: formatMessage(
                    'pages.system.notices.validation.typeRequired',
                    'Type is required.',
                  ),
                },
              ]}
            >
              <Select style={{ width: 180 }} options={noticeTypeOptions} />
            </Form.Item>
            <Form.Item
              label={formatMessage(
                'pages.system.notices.fields.enabled',
                'Enabled',
              )}
              name="enabled"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Space>
          <Form.Item
            label={formatMessage(
              'pages.system.notices.fields.titleTemplate',
              'Title Template',
            )}
            name="titleTemplate"
            rules={[
              {
                required: true,
                message: formatMessage(
                  'pages.system.notices.validation.titleTemplateRequired',
                  'Title template is required.',
                ),
              },
            ]}
          >
            <Input
              maxLength={160}
              placeholder={formatMessage(
                'pages.system.notices.templates.placeholders.title',
                'Release window: {{version}}',
              )}
            />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              'pages.system.notices.fields.contentTemplate',
              'Content Template',
            )}
            name="contentTemplate"
            rules={[
              {
                required: true,
                message: formatMessage(
                  'pages.system.notices.validation.contentTemplateRequired',
                  'Content template is required.',
                ),
              },
            ]}
          >
            <Input.TextArea
              rows={5}
              maxLength={2000}
              placeholder={formatMessage(
                'pages.system.notices.templates.placeholders.content',
                'Version {{version}} is scheduled for {{window}}.',
              )}
            />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              'pages.system.notices.fields.remark',
              'Remark',
            )}
            name="remark"
          >
            <Input.TextArea rows={2} maxLength={300} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title={
          renderTemplateFor
            ? formatMessage(
                'pages.system.notices.templates.previewTitleForTemplate',
                'Notice template render preview: {name}',
                { name: renderTemplateFor.name },
              )
            : formatMessage(
                'pages.system.notices.templates.previewTitle',
                'Notice template render preview',
              )
        }
        open={Boolean(renderTemplateFor)}
        onCancel={() => {
          setRenderTemplateFor(undefined);
          setTemplateRenderPreview(undefined);
        }}
        footer={[
          <Button
            key="preview"
            icon={<PlayCircleOutlined />}
            loading={templatePreviewLoading}
            onClick={() => void renderTemplatePreview()}
          >
            {formatMessage(
              'pages.system.notices.templates.actions.renderPreviewButton',
              'Render Preview',
            )}
          </Button>,
          <Button
            key="cancel"
            onClick={() => {
              setRenderTemplateFor(undefined);
              setTemplateRenderPreview(undefined);
            }}
          >
            {formatMessage('pages.system.notices.actions.cancel', 'Cancel')}
          </Button>,
          <Button
            key="create"
            icon={<SendOutlined />}
            loading={templateNoticeSubmitting}
            onClick={() => void createDraftFromTemplate()}
          >
            {formatMessage(
              'pages.system.notices.templates.actions.createDraft',
              'Create draft from template',
            )}
          </Button>,
          <Button
            key="test-send"
            type="primary"
            icon={<SendOutlined />}
            loading={templateTestSubmitting}
            onClick={() => void testSendTemplate()}
          >
            {formatMessage(
              'pages.system.notices.templates.actions.testSend',
              'Test send',
            )}
          </Button>,
        ]}
        width={720}
        destroyOnHidden
      >
        {renderTemplateFor ? (
          <Form<NoticeTemplateRenderFormValues>
            form={templateRenderForm}
            layout="vertical"
          >
            <Space align="start" size="middle" wrap>
              <Form.Item
                label={formatMessage(
                  'pages.system.notices.fields.audience',
                  'Audience',
                )}
                name="audience"
                rules={[
                  {
                    required: true,
                    message: formatMessage(
                      'pages.system.notices.validation.audienceRequired',
                      'Audience is required.',
                    ),
                  },
                ]}
              >
                <Select style={{ width: 160 }} options={audienceOptions} />
              </Form.Item>
              <Form.Item
                label={formatMessage(
                  'pages.system.notices.fields.pinned',
                  'Pinned',
                )}
                name="pinned"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
              <Form.Item
                label={formatMessage(
                  'pages.system.notices.fields.recipientUser',
                  'Recipient User',
                )}
                name="recipientUserId"
              >
                <Select
                  allowClear
                  showSearch
                  loading={userOptionsLoading}
                  optionFilterProp="label"
                  style={{ width: 240 }}
                  options={userOptions.map((user) => ({
                    label: `${user.displayName} (${user.username})`,
                    value: user.id,
                  }))}
                  placeholder={formatMessage(
                    'pages.system.notices.templates.placeholders.recipient',
                    'Select recipient',
                  )}
                />
              </Form.Item>
            </Space>
            {renderTemplateFor.params.map((param) => (
              <Form.Item
                key={param}
                label={param}
                name={['templateParams', param]}
                rules={[
                  {
                    required: true,
                    message: formatMessage(
                      'pages.system.notices.validation.templateParamRequired',
                      '{param} is required.',
                      { param },
                    ),
                  },
                ]}
              >
                <Input maxLength={160} />
              </Form.Item>
            ))}
            {renderTemplateFor.params.length === 0 ? (
              <Alert
                showIcon
                type="info"
                message={formatMessage(
                  'pages.system.notices.templates.noRequiredParams',
                  'This template has no required parameters.',
                )}
                style={{ marginBlockEnd: 16 }}
              />
            ) : null}
            {templateRenderPreview ? (
              <Alert
                showIcon
                type="success"
                message={formatMessage(
                  'pages.system.notices.templates.previewTitle',
                  'Notice template render preview',
                )}
                description={
                  <Space direction="vertical" size={4}>
                    <Typography.Text strong>
                      {templateRenderPreview.title}
                    </Typography.Text>
                    <Typography.Text>
                      {templateRenderPreview.content}
                    </Typography.Text>
                  </Space>
                }
              />
            ) : null}
          </Form>
        ) : null}
      </Modal>
    </PageContainer>
  );
}
