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
} from '@opencore/sdk';
import { useIntl, useLocation, useModel } from '@umijs/max';
import {
  Alert,
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
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
  getOpenCoreSystemNoticeInboxEventsPath,
  getOpenCoreSystemNoticeTemplate,
  listOpenCoreSystemNoticeInbox,
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
  templateParams?: Record<string, string>;
};

type ExternalNoticeDeliveryChannel = Extract<
  SystemNoticeDeliveryChannel,
  'mail' | 'sms'
>;

type NoticeTab = 'manage' | 'inbox' | 'templates';

const searchFields: CurrentPageSearchField<SystemNoticeSummary>[] = [
  'title',
  'content',
  'createdBy',
  'type',
  'status',
  'audience',
];
const templateSearchFields: CurrentPageSearchField<SystemNoticeTemplateSummary>[] =
  ['code', 'name', 'type', 'titleTemplate', 'contentTemplate', 'remark'];

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

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export default function SystemNoticesPage() {
  const intl = useIntl();
  const [form] = Form.useForm<NoticeFormValues>();
  const [templateForm] = Form.useForm<NoticeTemplateFormValues>();
  const [templateRenderForm] = Form.useForm<NoticeTemplateRenderFormValues>();
  const location = useLocation();
  const { initialState } = useModel('@@initialState');
  const [activeTab, setActiveTab] = useState<NoticeTab>(() =>
    getNoticeTabFromSearch(location.search),
  );
  const [rows, setRows] = useState<readonly SystemNoticeSummary[]>([]);
  const [inboxRows, setInboxRows] = useState<
    readonly SystemNoticeInboxSummary[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [inboxLoading, setInboxLoading] = useState(true);
  const [templates, setTemplates] = useState<
    readonly SystemNoticeTemplateSummary[]
  >([]);
  const [templateLoading, setTemplateLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [inboxLoadError, setInboxLoadError] = useState<string>();
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
  const realtimeEventsPath = getOpenCoreSystemNoticeInboxEventsPath();
  const formatMessage = (
    id: string,
    defaultMessage: string,
    values?: Record<string, number | string>,
  ) =>
    values
      ? intl.formatMessage({ id, defaultMessage }, values)
      : intl.formatMessage({ id, defaultMessage });
  const noticeStatusLabels: Record<SystemNoticeSummary['status'], string> = {
    archived: formatMessage(
      'pages.system.notices.status.archived',
      'archived',
    ),
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
  const exportColumns: CurrentPageExportColumn<SystemNoticeSummary>[] = [
    { title: formatMessage('pages.system.notices.fields.id', 'ID'), dataIndex: 'id' },
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
      title: formatMessage('pages.system.notices.fields.createdBy', 'Created By'),
      dataIndex: 'createdBy',
    },
    {
      title: formatMessage('pages.system.notices.fields.createdAt', 'Created At'),
      dataIndex: 'createdAt',
    },
    {
      title: formatMessage('pages.system.notices.fields.updatedAt', 'Updated At'),
      dataIndex: 'updatedAt',
    },
  ];
  const inboxExportColumns: CurrentPageExportColumn<SystemNoticeInboxSummary>[] =
    [
      ...exportColumns,
      {
        title: formatMessage('pages.system.notices.fields.read', 'Read'),
        renderText: (record) => (record.read ? readLabels.read : readLabels.unread),
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
        title: formatMessage('pages.system.notices.fields.updatedAt', 'Updated At'),
        dataIndex: 'updatedAt',
      },
    ];
  const createDetailFields = (
    record: SystemNoticeSummary,
  ): DetailField[] => [
    { label: formatMessage('pages.system.notices.fields.id', 'ID'), value: record.id },
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
      label: formatMessage('pages.system.notices.fields.validFrom', 'Valid From'),
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
      label: formatMessage('pages.system.notices.fields.createdBy', 'Created By'),
      value: record.createdBy,
    },
    {
      label: formatMessage('pages.system.notices.fields.createdAt', 'Created At'),
      value: record.createdAt,
    },
    {
      label: formatMessage('pages.system.notices.fields.updatedAt', 'Updated At'),
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
    { label: formatMessage('pages.system.notices.fields.id', 'ID'), value: record.id },
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
      label: formatMessage('pages.system.notices.fields.createdAt', 'Created At'),
      value: record.createdAt,
    },
    {
      label: formatMessage('pages.system.notices.fields.updatedAt', 'Updated At'),
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
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<SystemNoticeSummary>({
      rows,
      searchFields,
      searchPlaceholder: formatMessage(
        'pages.system.notices.search.placeholder',
        'Search system notices',
      ),
      selectFilters: filterOptions,
    });
  const { filteredRows: filteredTemplates, toolbar: templateFilterToolbar } =
    useCurrentPageFilters<SystemNoticeTemplateSummary>({
      rows: templates,
      searchFields: templateSearchFields,
      searchPlaceholder: formatMessage(
        'pages.system.notices.templates.searchPlaceholder',
        'Search system notice templates',
      ),
      selectFilters: templateFilterOptions,
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
      setInboxLoadError(undefined);
    } catch (error: unknown) {
      setInboxRows([]);
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

  useEffect(() => {
    void loadNotices();
    void loadInbox();
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
        templateParams: Object.fromEntries(
          fresh.params.map((param) => [param, '']),
        ),
      });
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
    } finally {
      setTemplateNoticeSubmitting(false);
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

    if (deliveriesOpenFor?.id === record.id) {
      await openDeliveryRecords(record);
    }
  };

  const refreshOpenDeliveries = async () => {
    if (deliveriesOpenFor) {
      await openDeliveryRecords(deliveriesOpenFor);
    }
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
    await refreshOpenDeliveries();
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
    await refreshOpenDeliveries();
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
    await refreshOpenDeliveries();
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
    await refreshOpenDeliveries();
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
    await refreshOpenDeliveries();
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
      setSelectedInboxDetail(await getOpenCoreSystemNoticeInboxItem(record.id));
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
  };

  const markAllInboxNoticesRead = async () => {
    await markAllOpenCoreSystemNoticesRead();
    message.success(
      formatMessage(
        'pages.system.notices.inbox.messages.allMarkedRead',
        'All system notices marked read.',
      ),
    );
    await loadInbox();
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
      title: formatMessage('pages.system.notices.fields.createdBy', 'Created By'),
      dataIndex: 'createdBy',
    },
    {
      title: formatMessage('pages.system.notices.actions.column', 'Actions'),
      valueType: 'option',
      width: 520,
      render: (_, record) => {
        const archived = record.status === 'archived';
        const draft = record.status === 'draft';
        const published = record.status === 'published';

        return (
          <Space size="small">
            <Tooltip
              title={formatMessage(
                'pages.system.notices.actions.detail',
                'Detail',
              )}
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
              title={formatMessage(
                'pages.system.notices.actions.readUsers',
                'Read users',
              )}
            >
              <Button
                aria-label={formatMessage(
                  'pages.system.notices.actions.readUsersAria',
                  'View read users for {title}',
                  { title: record.title },
                )}
                icon={<TeamOutlined />}
                onClick={() => void openReadUsers(record)}
                size="small"
              />
            </Tooltip>
            <Tooltip
              title={formatMessage(
                'pages.system.notices.actions.deliveryRecords',
                'Delivery records',
              )}
            >
              <Button
                aria-label={formatMessage(
                  'pages.system.notices.actions.deliveryRecordsAria',
                  'View delivery records for {title}',
                  { title: record.title },
                )}
                icon={<InboxOutlined />}
                onClick={() => void openDeliveryRecords(record)}
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
            <Popconfirm
              title={formatMessage(
                'pages.system.notices.confirm.publish',
                'Publish this notice?',
              )}
              okText={formatMessage(
                'pages.system.notices.actions.publish',
                'Publish',
              )}
              onConfirm={() => void publishNotice(record)}
              disabled={!draft}
            >
              <Tooltip
                title={
                  draft
                    ? formatMessage(
                        'pages.system.notices.actions.publish',
                        'Publish',
                      )
                    : formatMessage(
                        'pages.system.notices.actions.draftPublishOnly',
                        'Only draft notices can publish',
                      )
                }
              >
                <Button
                  aria-label={formatMessage(
                    'pages.system.notices.actions.publishAria',
                    'Publish {title}',
                    { title: record.title },
                  )}
                  disabled={!draft}
                  icon={<SendOutlined />}
                  size="small"
                />
              </Tooltip>
            </Popconfirm>
            <Popconfirm
              title={formatMessage(
                'pages.system.notices.confirm.dispatchInApp',
                'Dispatch in-app delivery records?',
              )}
              okText={formatMessage(
                'pages.system.notices.actions.dispatch',
                'Dispatch',
              )}
              onConfirm={() => void dispatchNoticeDeliveries(record, 'in_app')}
              disabled={!published}
            >
              <Tooltip
                title={
                  published
                    ? formatMessage(
                        'pages.system.notices.actions.dispatchInApp',
                        'Dispatch in-app deliveries',
                      )
                    : formatMessage(
                        'pages.system.notices.actions.publishedDispatchOnly',
                        'Only published notices can dispatch',
                      )
                }
              >
                <Button
                  aria-label={formatMessage(
                    'pages.system.notices.actions.dispatchInAppAria',
                    'Dispatch delivery records for {title}',
                    { title: record.title },
                  )}
                  disabled={!published}
                  icon={<SendOutlined />}
                  size="small"
                />
              </Tooltip>
            </Popconfirm>
            <Popconfirm
              title={formatMessage(
                'pages.system.notices.confirm.dispatchMail',
                'Dispatch mail delivery records?',
              )}
              okText={formatMessage(
                'pages.system.notices.actions.dispatch',
                'Dispatch',
              )}
              onConfirm={() => void dispatchNoticeDeliveries(record, 'mail')}
              disabled={!published}
            >
              <Tooltip
                title={
                  published
                    ? formatMessage(
                        'pages.system.notices.actions.dispatchMail',
                        'Dispatch mail deliveries',
                      )
                    : formatMessage(
                        'pages.system.notices.actions.publishedDispatchOnly',
                        'Only published notices can dispatch',
                      )
                }
              >
                <Button
                  aria-label={formatMessage(
                    'pages.system.notices.actions.dispatchMailAria',
                    'Dispatch mail delivery records for {title}',
                    { title: record.title },
                  )}
                  disabled={!published}
                  icon={<MailOutlined />}
                  size="small"
                />
              </Tooltip>
            </Popconfirm>
            <Popconfirm
              title={formatMessage(
                'pages.system.notices.confirm.dispatchSms',
                'Dispatch SMS delivery records?',
              )}
              okText={formatMessage(
                'pages.system.notices.actions.dispatch',
                'Dispatch',
              )}
              onConfirm={() => void dispatchNoticeDeliveries(record, 'sms')}
              disabled={!published}
            >
              <Tooltip
                title={
                  published
                    ? formatMessage(
                        'pages.system.notices.actions.dispatchSms',
                        'Dispatch SMS deliveries',
                      )
                    : formatMessage(
                        'pages.system.notices.actions.publishedDispatchOnly',
                        'Only published notices can dispatch',
                      )
                }
              >
                <Button
                  aria-label={formatMessage(
                    'pages.system.notices.actions.dispatchSmsAria',
                    'Dispatch SMS delivery records for {title}',
                    { title: record.title },
                  )}
                  disabled={!published}
                  icon={<MessageOutlined />}
                  size="small"
                />
              </Tooltip>
            </Popconfirm>
            <Popconfirm
              title={formatMessage(
                'pages.system.notices.confirm.executeLocal',
                'Execute local notice provider?',
              )}
              okText={formatMessage(
                'pages.system.notices.actions.execute',
                'Execute',
              )}
              onConfirm={() => void executeNoticeDeliveries(record, 'in_app')}
              disabled={!published}
            >
              <Tooltip
                title={
                  published
                    ? formatMessage(
                        'pages.system.notices.actions.executeLocal',
                        'Execute local provider',
                      )
                    : formatMessage(
                        'pages.system.notices.actions.publishedExecuteOnly',
                        'Only published notices can execute',
                      )
                }
              >
                <Button
                  aria-label={formatMessage(
                    'pages.system.notices.actions.executeLocalAria',
                    'Execute local provider for {title}',
                    { title: record.title },
                  )}
                  disabled={!published}
                  icon={<PlayCircleOutlined />}
                  size="small"
                />
              </Tooltip>
            </Popconfirm>
            <Popconfirm
              title={formatMessage(
                'pages.system.notices.confirm.executeMail',
                'Execute mail outbox provider?',
              )}
              okText={formatMessage(
                'pages.system.notices.actions.execute',
                'Execute',
              )}
              onConfirm={() => void executeNoticeDeliveries(record, 'mail')}
              disabled={!published}
            >
              <Tooltip
                title={
                  published
                    ? formatMessage(
                        'pages.system.notices.actions.executeMail',
                        'Execute mail outbox provider',
                      )
                    : formatMessage(
                        'pages.system.notices.actions.publishedExecuteOnly',
                        'Only published notices can execute',
                      )
                }
              >
                <Button
                  aria-label={formatMessage(
                    'pages.system.notices.actions.executeMailAria',
                    'Execute mail provider for {title}',
                    { title: record.title },
                  )}
                  disabled={!published}
                  icon={<MailOutlined />}
                  size="small"
                />
              </Tooltip>
            </Popconfirm>
            <Popconfirm
              title={formatMessage(
                'pages.system.notices.confirm.executeSms',
                'Execute SMS outbox provider?',
              )}
              okText={formatMessage(
                'pages.system.notices.actions.execute',
                'Execute',
              )}
              onConfirm={() => void executeNoticeDeliveries(record, 'sms')}
              disabled={!published}
            >
              <Tooltip
                title={
                  published
                    ? formatMessage(
                        'pages.system.notices.actions.executeSms',
                        'Execute SMS outbox provider',
                      )
                    : formatMessage(
                        'pages.system.notices.actions.publishedExecuteOnly',
                        'Only published notices can execute',
                      )
                }
              >
                <Button
                  aria-label={formatMessage(
                    'pages.system.notices.actions.executeSmsAria',
                    'Execute SMS provider for {title}',
                    { title: record.title },
                  )}
                  disabled={!published}
                  icon={<MessageOutlined />}
                  size="small"
                />
              </Tooltip>
            </Popconfirm>
            <Popconfirm
              title={formatMessage(
                'pages.system.notices.confirm.archive',
                'Archive this notice?',
              )}
              okText={formatMessage(
                'pages.system.notices.actions.archive',
                'Archive',
              )}
              onConfirm={() => void archiveNotice(record)}
              disabled={archived}
            >
              <Tooltip
                title={
                  archived
                    ? formatMessage(
                        'pages.system.notices.actions.alreadyArchived',
                        'Already archived',
                      )
                    : formatMessage(
                        'pages.system.notices.actions.archive',
                        'Archive',
                      )
                }
              >
                <Button
                  aria-label={formatMessage(
                    'pages.system.notices.actions.archiveAria',
                    'Archive {title}',
                    { title: record.title },
                  )}
                  disabled={archived}
                  icon={<StopOutlined />}
                  size="small"
                />
              </Tooltip>
            </Popconfirm>
            <Popconfirm
              title={formatMessage(
                'pages.system.notices.confirm.deleteOne',
                'Delete this notice?',
              )}
              okText={formatMessage(
                'pages.system.notices.actions.delete',
                'Delete',
              )}
              okButtonProps={{ danger: true }}
              onConfirm={() => void deleteNotice(record)}
            >
              <Tooltip
                title={formatMessage(
                  'pages.system.notices.actions.delete',
                  'Delete',
                )}
              >
                <Button
                  aria-label={formatMessage(
                    'pages.system.notices.actions.deleteAria',
                    'Delete {title}',
                    { title: record.title },
                  )}
                  danger
                  icon={<DeleteOutlined />}
                  size="small"
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        );
      },
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
      title: formatMessage('pages.system.notices.fields.recipient', 'Recipient'),
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
      title: formatMessage('pages.system.notices.fields.lastError', 'Last Error'),
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
      title: formatMessage('pages.system.notices.fields.updatedAt', 'Updated At'),
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
  const hasSchedulableExternalOutbox = deliveryRows.some(
    isSchedulableExternalOutboxDelivery,
  );

  return (
    <PageContainer
      title={formatMessage('pages.system.notices.title', 'System Notices')}
      subTitle={formatMessage('pages.system.notices.section', 'S7 System')}
    >
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as NoticeTab)}
        items={[
          {
            key: 'manage',
            label: formatMessage('pages.system.notices.tabs.manage', 'Manage'),
            children: (
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
                <ProTable<SystemNoticeSummary>
                  rowKey="id"
                  loading={loading}
                  search={false}
                  options={false}
                  toolBarRender={() => [
                    filterToolbar,
                    <Button
                      key="create"
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={openCreateForm}
                    >
                      {formatMessage('pages.system.notices.actions.new', 'New')}
                    </Button>,
                    <Button
                      key="refresh"
                      icon={<ReloadOutlined />}
                      onClick={() => void loadNotices()}
                    >
                      {formatMessage(
                        'pages.system.notices.actions.refresh',
                        'Refresh',
                      )}
                    </Button>,
                    <CurrentPageExportButton<SystemNoticeSummary>
                      key="export"
                      columns={exportColumns}
                      resource="core-notices"
                      rows={filteredRows}
                    />,
                  ]}
                  pagination={{
                    pageSize: 10,
                  }}
                  dataSource={filteredRows}
                  columns={columns}
                />
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
                <Alert
                  showIcon
                  type="info"
                  message={formatMessage(
                    'pages.system.notices.inbox.realtimeStream',
                    'Realtime stream',
                  )}
                  description={formatMessage(
                    'pages.system.notices.inbox.realtimeDescription',
                    'SSE inbox events: {path}',
                    { path: realtimeEventsPath },
                  )}
                  style={{ marginBlockEnd: 16 }}
                />
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
                <ProTable<SystemNoticeInboxSummary>
                  rowKey="id"
                  loading={inboxLoading}
                  search={false}
                  options={false}
                  toolBarRender={() => [
                    <Button
                      key="mark-all"
                      icon={<CheckOutlined />}
                      onClick={() => void markAllInboxNoticesRead()}
                      disabled={inboxRows.every((record) => record.read)}
                    >
                      {formatMessage(
                        'pages.system.notices.inbox.actions.markAllRead',
                        'Mark all read',
                      )}
                    </Button>,
                    <Button
                      key="refresh"
                      icon={<ReloadOutlined />}
                      onClick={() => void loadInbox()}
                    >
                      {formatMessage(
                        'pages.system.notices.actions.refresh',
                        'Refresh',
                      )}
                    </Button>,
                    <CurrentPageExportButton<SystemNoticeInboxSummary>
                      key="export"
                      columns={inboxExportColumns}
                      resource="core-notice-inbox"
                      rows={inboxRows}
                    />,
                  ]}
                  pagination={{
                    pageSize: 10,
                  }}
                  dataSource={inboxRows}
                  columns={inboxColumns}
                />
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
                <ProTable<SystemNoticeTemplateSummary>
                  rowKey="code"
                  loading={templateLoading}
                  search={false}
                  options={false}
                  toolBarRender={() => [
                    templateFilterToolbar,
                    <Button
                      key="create"
                      type="primary"
                      icon={<FileTextOutlined />}
                      onClick={openCreateTemplateForm}
                    >
                      {formatMessage(
                        'pages.system.notices.templates.actions.new',
                        'New Template',
                      )}
                    </Button>,
                    <Button
                      key="refresh"
                      icon={<ReloadOutlined />}
                      onClick={() => void loadTemplates()}
                    >
                      {formatMessage(
                        'pages.system.notices.actions.refresh',
                        'Refresh',
                      )}
                    </Button>,
                    <CurrentPageExportButton<SystemNoticeTemplateSummary>
                      key="export"
                      columns={templateExportColumns}
                      resource="core-notice-templates"
                      rows={filteredTemplates}
                    />,
                  ]}
                  pagination={{
                    pageSize: 10,
                  }}
                  dataSource={filteredTemplates}
                  columns={templateColumns}
                />
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
              disabled={!hasSchedulableExternalOutbox}
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
              {formatMessage(
                'pages.system.notices.actions.refresh',
                'Refresh',
              )}
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
            label={formatMessage('pages.system.notices.fields.remark', 'Remark')}
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
            type="primary"
            icon={<SendOutlined />}
            loading={templateNoticeSubmitting}
            onClick={() => void createDraftFromTemplate()}
          >
            {formatMessage(
              'pages.system.notices.templates.actions.createDraft',
              'Create draft from template',
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
