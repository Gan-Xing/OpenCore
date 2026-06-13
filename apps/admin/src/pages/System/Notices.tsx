import {
  CheckOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  PlusOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  SendOutlined,
  StopOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import {
  createSystemNoticeFixtures,
  type SystemNoticeAudience,
  type SystemNoticeInboxSummary,
  type SystemNoticeReadUserSummary,
  type SystemNoticeSummary,
  type SystemNoticeTemplateRenderSummary,
  type SystemNoticeTemplateSummary,
  type SystemNoticeType,
} from '@opencore/sdk';
import { useLocation, useModel } from '@umijs/max';
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
  getOpenCoreSystemNotice,
  getOpenCoreSystemNoticeInboxItem,
  getOpenCoreSystemNoticeTemplate,
  listOpenCoreSystemNoticeInbox,
  listOpenCoreSystemNoticeReadUsers,
  listOpenCoreSystemNoticeTemplates,
  listOpenCoreSystemNotices,
  markAllOpenCoreSystemNoticesRead,
  markOpenCoreSystemNoticesRead,
  publishOpenCoreSystemNotice,
  renderOpenCoreSystemNoticeTemplate,
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

type NoticeTab = 'manage' | 'inbox' | 'templates';

const fallbackRows = createSystemNoticeFixtures().items;
const searchFields: CurrentPageSearchField<SystemNoticeSummary>[] = [
  'title',
  'content',
  'createdBy',
  'type',
  'status',
  'audience',
];
const filterOptions: CurrentPageFilterOption<SystemNoticeSummary>[] = [
  {
    key: 'status',
    options: [
      { label: 'draft', value: 'draft' },
      { label: 'published', value: 'published' },
      { label: 'archived', value: 'archived' },
    ],
    placeholder: 'Status',
    predicate: (record, value) => record.status === value,
  },
  {
    key: 'type',
    options: [
      { label: 'announcement', value: 'announcement' },
      { label: 'maintenance', value: 'maintenance' },
      { label: 'security', value: 'security' },
    ],
    placeholder: 'Type',
    predicate: (record, value) => record.type === value,
  },
  {
    key: 'audience',
    options: [
      { label: 'all', value: 'all' },
      { label: 'admin', value: 'admin' },
    ],
    placeholder: 'Audience',
    predicate: (record, value) => record.audience === value,
  },
];
const exportColumns: CurrentPageExportColumn<SystemNoticeSummary>[] = [
  { title: 'ID', dataIndex: 'id' },
  { title: 'Title', dataIndex: 'title' },
  { title: 'Type', dataIndex: 'type' },
  { title: 'Status', dataIndex: 'status' },
  { title: 'Audience', dataIndex: 'audience' },
  { title: 'Pinned', dataIndex: 'pinned' },
  { title: 'Created By', dataIndex: 'createdBy' },
  { title: 'Created At', dataIndex: 'createdAt' },
  { title: 'Updated At', dataIndex: 'updatedAt' },
];
const templateSearchFields: CurrentPageSearchField<SystemNoticeTemplateSummary>[] =
  ['code', 'name', 'type', 'titleTemplate', 'contentTemplate', 'remark'];
const templateFilterOptions: CurrentPageFilterOption<SystemNoticeTemplateSummary>[] =
  [
    {
      key: 'type',
      options: [
        { label: 'announcement', value: 'announcement' },
        { label: 'maintenance', value: 'maintenance' },
        { label: 'security', value: 'security' },
      ],
      placeholder: 'Type',
      predicate: (record, value) => record.type === value,
    },
    {
      key: 'enabled',
      options: [
        { label: 'enabled', value: 'true' },
        { label: 'disabled', value: 'false' },
      ],
      placeholder: 'Enabled',
      predicate: (record, value) => String(record.enabled) === value,
    },
  ];
const templateExportColumns: CurrentPageExportColumn<SystemNoticeTemplateSummary>[] =
  [
    { title: 'Code', dataIndex: 'code' },
    { title: 'Name', dataIndex: 'name' },
    { title: 'Type', dataIndex: 'type' },
    { title: 'Enabled', dataIndex: 'enabled' },
    { title: 'Params', dataIndex: 'params' },
    { title: 'Title Template', dataIndex: 'titleTemplate' },
    { title: 'Content Template', dataIndex: 'contentTemplate' },
    { title: 'Remark', dataIndex: 'remark' },
    { title: 'Updated At', dataIndex: 'updatedAt' },
  ];

function createDetailFields(record: SystemNoticeSummary): DetailField[] {
  return [
    { label: 'ID', value: record.id },
    { label: 'Title', value: record.title },
    { label: 'Type', value: record.type },
    { label: 'Status', value: record.status },
    { label: 'Audience', value: record.audience },
    { label: 'Pinned', value: record.pinned ? 'yes' : 'no' },
    { label: 'Valid From', value: record.validFrom },
    { label: 'Valid To', value: record.validTo },
    { label: 'Published At', value: record.publishedAt },
    { label: 'Archived At', value: record.archivedAt },
    { label: 'Created By', value: record.createdBy },
    { label: 'Created At', value: record.createdAt },
    { label: 'Updated At', value: record.updatedAt },
    { label: 'Content', value: record.content },
  ];
}

function createInboxDetailFields(
  record: SystemNoticeInboxSummary,
): DetailField[] {
  return [
    ...createDetailFields(record),
    { label: 'Read', value: record.read ? 'yes' : 'no' },
    { label: 'Read At', value: record.readAt },
  ];
}

function createTemplateDetailFields(
  record: SystemNoticeTemplateSummary,
): DetailField[] {
  return [
    { label: 'ID', value: record.id },
    { label: 'Code', value: record.code },
    { label: 'Name', value: record.name },
    { label: 'Type', value: record.type },
    { label: 'Enabled', value: record.enabled ? 'yes' : 'no' },
    { label: 'Params', value: record.params.join(', ') || 'none' },
    { label: 'Title Template', value: record.titleTemplate },
    { label: 'Content Template', value: record.contentTemplate },
    { label: 'Remark', value: record.remark },
    { label: 'Created At', value: record.createdAt },
    { label: 'Updated At', value: record.updatedAt },
  ];
}

function renderStatus(status: SystemNoticeSummary['status']) {
  const color =
    status === 'published' ? 'green' : status === 'draft' ? 'gold' : 'default';
  return <Tag color={color}>{status}</Tag>;
}

function renderType(type: SystemNoticeSummary['type']) {
  const color =
    type === 'security' ? 'red' : type === 'maintenance' ? 'blue' : 'purple';
  return <Tag color={color}>{type}</Tag>;
}

function getNoticeTabFromSearch(search: string): NoticeTab {
  const tab = new URLSearchParams(search).get('tab');

  if (tab === 'inbox' || tab === 'templates') {
    return tab;
  }

  return 'manage';
}

export default function SystemNoticesPage() {
  const [form] = Form.useForm<NoticeFormValues>();
  const [templateForm] = Form.useForm<NoticeTemplateFormValues>();
  const [templateRenderForm] = Form.useForm<NoticeTemplateRenderFormValues>();
  const location = useLocation();
  const { initialState } = useModel('@@initialState');
  const [activeTab, setActiveTab] = useState<NoticeTab>(() =>
    getNoticeTabFromSearch(location.search),
  );
  const [rows, setRows] =
    useState<readonly SystemNoticeSummary[]>(fallbackRows);
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
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<SystemNoticeSummary>({
      rows,
      searchFields,
      searchPlaceholder: 'Search system notices',
      selectFilters: filterOptions,
    });
  const { filteredRows: filteredTemplates, toolbar: templateFilterToolbar } =
    useCurrentPageFilters<SystemNoticeTemplateSummary>({
      rows: templates,
      searchFields: templateSearchFields,
      searchPlaceholder: 'Search system notice templates',
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
      setRows(fallbackRows);
      setLoadError(
        error instanceof Error
          ? error.message
          : 'Unable to load system notices.',
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
        error instanceof Error
          ? error.message
          : 'Unable to load system notice inbox.',
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
      setTemplateLoadError(
        error instanceof Error
          ? error.message
          : 'Unable to load system notice templates.',
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
        error instanceof Error ? error.message : 'Unable to open notice.',
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
        error instanceof Error
          ? error.message
          : 'Unable to open notice template.',
      );
    }
  };

  const openDetail = async (record: SystemNoticeSummary) => {
    try {
      setSelectedDetail(await getOpenCoreSystemNotice(record.id));
    } catch {
      setSelectedDetail(record);
    }
  };

  const openTemplateDetail = async (record: SystemNoticeTemplateSummary) => {
    try {
      setSelectedTemplateDetail(
        await getOpenCoreSystemNoticeTemplate(record.code),
      );
    } catch {
      setSelectedTemplateDetail(record);
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
        error instanceof Error
          ? error.message
          : 'Unable to open notice template render preview.',
      );
    }
  };

  const openReadUsers = async (record: SystemNoticeSummary) => {
    setReadUsersOpenFor(record);
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
        error instanceof Error
          ? error.message
          : 'Unable to load system notice read users.',
      );
    } finally {
      setReadUsersLoading(false);
    }
  };

  const submitForm = async () => {
    const values = await form.validateFields();
    const createdBy = initialState?.currentUser?.username ?? 'admin';

    setSubmitting(true);
    try {
      if (editingNotice) {
        await updateOpenCoreSystemNotice(editingNotice.id, values);
        message.success('System notice updated.');
      } else {
        await createOpenCoreSystemNotice({
          ...values,
          createdBy,
        });
        message.success('System notice created.');
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
        message.success('System notice template updated.');
      } else {
        await createOpenCoreSystemNoticeTemplate(values);
        message.success('System notice template created.');
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
      message.success('Draft notice created from template.');
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
    message.success('System notice published.');
    await loadNotices();
    await loadInbox();
  };

  const archiveNotice = async (record: SystemNoticeSummary) => {
    await archiveOpenCoreSystemNotice(record.id);
    message.success('System notice archived.');
    await loadNotices();
    await loadInbox();
  };

  const deleteNotice = async (record: SystemNoticeSummary) => {
    await deleteOpenCoreSystemNotice(record.id);
    message.success('System notice deleted.');
    await loadNotices();
    await loadInbox();
  };

  const deleteTemplate = async (record: SystemNoticeTemplateSummary) => {
    await deleteOpenCoreSystemNoticeTemplate(record.code);
    message.success('System notice template deleted.');
    await loadTemplates();
  };

  const openInboxDetail = async (record: SystemNoticeInboxSummary) => {
    try {
      setSelectedInboxDetail(await getOpenCoreSystemNoticeInboxItem(record.id));
    } catch {
      setSelectedInboxDetail(record);
    }
  };

  const markInboxNoticeRead = async (record: SystemNoticeInboxSummary) => {
    await markOpenCoreSystemNoticesRead({ ids: [record.id] });
    message.success('System notice marked read.');
    await loadInbox();
  };

  const markAllInboxNoticesRead = async () => {
    await markAllOpenCoreSystemNoticesRead();
    message.success('All system notices marked read.');
    await loadInbox();
  };

  const columns: ProColumns<SystemNoticeSummary>[] = [
    {
      title: 'Title',
      dataIndex: 'title',
      render: (_, record) => (
        <Typography.Link onClick={() => void openDetail(record)}>
          {record.title}
        </Typography.Link>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      render: (_, record) => renderType(record.type),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (_, record) => renderStatus(record.status),
    },
    {
      title: 'Audience',
      dataIndex: 'audience',
      render: (_, record) => <Tag>{record.audience}</Tag>,
    },
    {
      title: 'Pinned',
      dataIndex: 'pinned',
      render: (_, record) => (
        <Tag color={record.pinned ? 'blue' : 'default'}>
          {record.pinned ? 'pinned' : 'normal'}
        </Tag>
      ),
    },
    { title: 'Created By', dataIndex: 'createdBy' },
    {
      title: 'Actions',
      valueType: 'option',
      width: 280,
      render: (_, record) => {
        const archived = record.status === 'archived';
        const draft = record.status === 'draft';

        return (
          <Space size="small">
            <Tooltip title="Detail">
              <Button
                aria-label={`View ${record.title}`}
                icon={<EyeOutlined />}
                onClick={() => void openDetail(record)}
                size="small"
              />
            </Tooltip>
            <Tooltip title="Read users">
              <Button
                aria-label={`View read users for ${record.title}`}
                icon={<TeamOutlined />}
                onClick={() => void openReadUsers(record)}
                size="small"
              />
            </Tooltip>
            <Tooltip
              title={archived ? 'Archived notices cannot be edited' : 'Edit'}
            >
              <Button
                aria-label={`Edit ${record.title}`}
                disabled={archived}
                icon={<EditOutlined />}
                onClick={() => void openEditForm(record)}
                size="small"
              />
            </Tooltip>
            <Popconfirm
              title="Publish this notice?"
              okText="Publish"
              onConfirm={() => void publishNotice(record)}
              disabled={!draft}
            >
              <Tooltip
                title={draft ? 'Publish' : 'Only draft notices can publish'}
              >
                <Button
                  aria-label={`Publish ${record.title}`}
                  disabled={!draft}
                  icon={<SendOutlined />}
                  size="small"
                />
              </Tooltip>
            </Popconfirm>
            <Popconfirm
              title="Archive this notice?"
              okText="Archive"
              onConfirm={() => void archiveNotice(record)}
              disabled={archived}
            >
              <Tooltip title={archived ? 'Already archived' : 'Archive'}>
                <Button
                  aria-label={`Archive ${record.title}`}
                  disabled={archived}
                  icon={<StopOutlined />}
                  size="small"
                />
              </Tooltip>
            </Popconfirm>
            <Popconfirm
              title="Delete this notice?"
              okText="Delete"
              okButtonProps={{ danger: true }}
              onConfirm={() => void deleteNotice(record)}
            >
              <Tooltip title="Delete">
                <Button
                  aria-label={`Delete ${record.title}`}
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
    { title: 'Username', dataIndex: 'username' },
    { title: 'Display Name', dataIndex: 'displayName' },
    { title: 'Read At', dataIndex: 'readAt' },
  ];

  const inboxColumns: ProColumns<SystemNoticeInboxSummary>[] = [
    {
      title: 'Title',
      dataIndex: 'title',
      render: (_, record) => (
        <Typography.Link onClick={() => void openInboxDetail(record)}>
          {record.title}
        </Typography.Link>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      render: (_, record) => renderType(record.type),
    },
    {
      title: 'Read',
      dataIndex: 'read',
      render: (_, record) => (
        <Tag color={record.read ? 'default' : 'red'}>
          {record.read ? 'read' : 'unread'}
        </Tag>
      ),
    },
    {
      title: 'Pinned',
      dataIndex: 'pinned',
      render: (_, record) => (
        <Tag color={record.pinned ? 'blue' : 'default'}>
          {record.pinned ? 'pinned' : 'normal'}
        </Tag>
      ),
    },
    { title: 'Published At', dataIndex: 'publishedAt' },
    {
      title: 'Actions',
      valueType: 'option',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Detail">
            <Button
              aria-label={`View inbox notice ${record.title}`}
              icon={<EyeOutlined />}
              onClick={() => void openInboxDetail(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip title={record.read ? 'Already read' : 'Mark read'}>
            <Button
              aria-label={`Mark ${record.title} read`}
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
      title: 'Name',
      dataIndex: 'name',
      render: (_, record) => (
        <Typography.Link onClick={() => void openTemplateDetail(record)}>
          {record.name}
        </Typography.Link>
      ),
    },
    { title: 'Code', dataIndex: 'code' },
    {
      title: 'Type',
      dataIndex: 'type',
      render: (_, record) => renderType(record.type),
    },
    {
      title: 'Enabled',
      dataIndex: 'enabled',
      render: (_, record) => (
        <Tag color={record.enabled ? 'green' : 'default'}>
          {record.enabled ? 'enabled' : 'disabled'}
        </Tag>
      ),
    },
    {
      title: 'Params',
      dataIndex: 'params',
      render: (_, record) => (
        <Space size={[0, 4]} wrap>
          {record.params.length > 0 ? (
            record.params.map((param) => <Tag key={param}>{param}</Tag>)
          ) : (
            <Tag>none</Tag>
          )}
        </Space>
      ),
    },
    { title: 'Updated At', dataIndex: 'updatedAt' },
    {
      title: 'Actions',
      valueType: 'option',
      width: 240,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Detail">
            <Button
              aria-label={`View template ${record.name}`}
              icon={<EyeOutlined />}
              onClick={() => void openTemplateDetail(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              aria-label={`Edit template ${record.name}`}
              icon={<EditOutlined />}
              onClick={() => void openEditTemplateForm(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip
            title={
              record.enabled
                ? 'Notice template render preview'
                : 'Disabled templates cannot render'
            }
          >
            <Button
              aria-label={`Render template ${record.name}`}
              disabled={!record.enabled}
              icon={<PlayCircleOutlined />}
              onClick={() => void openTemplateRender(record)}
              size="small"
            />
          </Tooltip>
          <Popconfirm
            title="Delete this notice template?"
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => void deleteTemplate(record)}
          >
            <Tooltip title="Delete">
              <Button
                aria-label={`Delete template ${record.name}`}
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

  return (
    <PageContainer title="System Notices" subTitle="S7 System">
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as NoticeTab)}
        items={[
          {
            key: 'manage',
            label: 'Manage',
            children: (
              <>
                {loadError ? (
                  <Alert
                    showIcon
                    type="warning"
                    message="Using fallback system notice snapshot"
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
                      New
                    </Button>,
                    <Button
                      key="refresh"
                      icon={<ReloadOutlined />}
                      onClick={() => void loadNotices()}
                    >
                      Refresh
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
            label: `Inbox (${inboxRows.filter((record) => !record.read).length})`,
            children: (
              <>
                {inboxLoadError ? (
                  <Alert
                    showIcon
                    type="warning"
                    message="Unable to load notice inbox"
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
                      Mark all read
                    </Button>,
                    <Button
                      key="refresh"
                      icon={<ReloadOutlined />}
                      onClick={() => void loadInbox()}
                    >
                      Refresh
                    </Button>,
                    <CurrentPageExportButton<SystemNoticeInboxSummary>
                      key="export"
                      columns={[
                        ...exportColumns,
                        { title: 'Read', dataIndex: 'read' },
                        { title: 'Read At', dataIndex: 'readAt' },
                      ]}
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
            label: 'System Notice Templates',
            children: (
              <>
                {templateLoadError ? (
                  <Alert
                    showIcon
                    type="warning"
                    message="Unable to load system notice templates"
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
                      New Template
                    </Button>,
                    <Button
                      key="refresh"
                      icon={<ReloadOutlined />}
                      onClick={() => void loadTemplates()}
                    >
                      Refresh
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
        title={selectedDetail?.title ?? 'System Notice Detail'}
      />
      <ReadOnlyDetailDrawer
        fields={
          selectedInboxDetail
            ? createInboxDetailFields(selectedInboxDetail)
            : []
        }
        onClose={() => setSelectedInboxDetail(undefined)}
        open={Boolean(selectedInboxDetail)}
        title={selectedInboxDetail?.title ?? 'System Notice Inbox Detail'}
      />
      <ReadOnlyDetailDrawer
        fields={
          selectedTemplateDetail
            ? createTemplateDetailFields(selectedTemplateDetail)
            : []
        }
        onClose={() => setSelectedTemplateDetail(undefined)}
        open={Boolean(selectedTemplateDetail)}
        title={selectedTemplateDetail?.name ?? 'System Notice Template Detail'}
      />
      <Modal
        title={
          readUsersOpenFor
            ? `System Notice Read Users: ${readUsersOpenFor.title}`
            : 'System Notice Read Users'
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
            type="warning"
            message="Unable to load system notice read users"
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
        title={editingNotice ? 'Edit System Notice' : 'New System Notice'}
        open={formOpen}
        onCancel={() => {
          setFormOpen(false);
          setEditingNotice(undefined);
        }}
        onOk={() => void submitForm()}
        confirmLoading={submitting}
        okText={editingNotice ? 'Save' : 'Create'}
      >
        <Form<NoticeFormValues> form={form} layout="vertical">
          <Form.Item
            label="Title"
            name="title"
            rules={[{ required: true, message: 'Title is required.' }]}
          >
            <Input maxLength={80} />
          </Form.Item>
          <Form.Item
            label="Content"
            name="content"
            rules={[{ required: true, message: 'Content is required.' }]}
          >
            <Input.TextArea rows={5} maxLength={2000} />
          </Form.Item>
          <Space align="start" size="middle" wrap>
            <Form.Item
              label="Type"
              name="type"
              rules={[{ required: true, message: 'Type is required.' }]}
            >
              <Select
                style={{ width: 180 }}
                options={[
                  { label: 'announcement', value: 'announcement' },
                  { label: 'maintenance', value: 'maintenance' },
                  { label: 'security', value: 'security' },
                ]}
              />
            </Form.Item>
            <Form.Item
              label="Audience"
              name="audience"
              rules={[{ required: true, message: 'Audience is required.' }]}
            >
              <Select
                style={{ width: 160 }}
                options={[
                  { label: 'all', value: 'all' },
                  { label: 'admin', value: 'admin' },
                ]}
              />
            </Form.Item>
            <Form.Item label="Pinned" name="pinned" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
      <Modal
        title={
          editingTemplate
            ? 'Edit System Notice Template'
            : 'New System Notice Template'
        }
        open={templateFormOpen}
        onCancel={() => {
          setTemplateFormOpen(false);
          setEditingTemplate(undefined);
        }}
        onOk={() => void submitTemplateForm()}
        confirmLoading={templateSubmitting}
        okText={editingTemplate ? 'Save' : 'Create'}
        width={720}
      >
        <Form<NoticeTemplateFormValues> form={templateForm} layout="vertical">
          <Space align="start" size="middle" wrap>
            <Form.Item
              label="Code"
              name="code"
              rules={[{ required: true, message: 'Code is required.' }]}
            >
              <Input
                disabled={Boolean(editingTemplate)}
                maxLength={80}
                placeholder="release.window"
                style={{ width: 220 }}
              />
            </Form.Item>
            <Form.Item
              label="Name"
              name="name"
              rules={[{ required: true, message: 'Name is required.' }]}
            >
              <Input maxLength={80} style={{ width: 220 }} />
            </Form.Item>
            <Form.Item
              label="Type"
              name="type"
              rules={[{ required: true, message: 'Type is required.' }]}
            >
              <Select
                style={{ width: 180 }}
                options={[
                  { label: 'announcement', value: 'announcement' },
                  { label: 'maintenance', value: 'maintenance' },
                  { label: 'security', value: 'security' },
                ]}
              />
            </Form.Item>
            <Form.Item label="Enabled" name="enabled" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>
          <Form.Item
            label="Title Template"
            name="titleTemplate"
            rules={[{ required: true, message: 'Title template is required.' }]}
          >
            <Input maxLength={160} placeholder="Release window: {{version}}" />
          </Form.Item>
          <Form.Item
            label="Content Template"
            name="contentTemplate"
            rules={[
              { required: true, message: 'Content template is required.' },
            ]}
          >
            <Input.TextArea
              rows={5}
              maxLength={2000}
              placeholder="Version {{version}} is scheduled for {{window}}."
            />
          </Form.Item>
          <Form.Item label="Remark" name="remark">
            <Input.TextArea rows={2} maxLength={300} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title={
          renderTemplateFor
            ? `Notice template render preview: ${renderTemplateFor.name}`
            : 'Notice template render preview'
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
            Render Preview
          </Button>,
          <Button
            key="cancel"
            onClick={() => {
              setRenderTemplateFor(undefined);
              setTemplateRenderPreview(undefined);
            }}
          >
            Cancel
          </Button>,
          <Button
            key="create"
            type="primary"
            icon={<SendOutlined />}
            loading={templateNoticeSubmitting}
            onClick={() => void createDraftFromTemplate()}
          >
            Create draft from template
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
                label="Audience"
                name="audience"
                rules={[{ required: true, message: 'Audience is required.' }]}
              >
                <Select
                  style={{ width: 160 }}
                  options={[
                    { label: 'all', value: 'all' },
                    { label: 'admin', value: 'admin' },
                  ]}
                />
              </Form.Item>
              <Form.Item label="Pinned" name="pinned" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Space>
            {renderTemplateFor.params.map((param) => (
              <Form.Item
                key={param}
                label={param}
                name={['templateParams', param]}
                rules={[{ required: true, message: `${param} is required.` }]}
              >
                <Input maxLength={160} />
              </Form.Item>
            ))}
            {renderTemplateFor.params.length === 0 ? (
              <Alert
                showIcon
                type="info"
                message="This template has no required parameters."
                style={{ marginBlockEnd: 16 }}
              />
            ) : null}
            {templateRenderPreview ? (
              <Alert
                showIcon
                type="success"
                message="Notice template render preview"
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
