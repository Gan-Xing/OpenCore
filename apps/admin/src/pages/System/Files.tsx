import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import { createFileAssetFixtures, type FileAssetSummary } from '@opencore/sdk';
import {
  Alert,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { useMemo, useEffect, useState } from 'react';
import {
  createOpenCoreFile,
  deleteOpenCoreFile,
  getOpenCoreFile,
  listOpenCoreFiles,
  updateOpenCoreFile,
} from '@/services/opencore/platform';
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
import {
  ReadOnlyDetailDrawer,
  type DetailField,
} from '../shared/ReadOnlyDetailDrawer';

type FileFormValues = {
  checksum?: string;
  mimeType: string;
  originalName: string;
  sizeBytes?: number;
  uploadedBy: string;
};

const fallbackRows = createFileAssetFixtures().items;
const searchFields: CurrentPageSearchField<FileAssetSummary>[] = [
  'originalName',
  'mimeType',
  'storageKey',
  'uploadedBy',
  'checksum',
];
const exportColumns: CurrentPageExportColumn<FileAssetSummary>[] = [
  { title: 'ID', dataIndex: 'id' },
  { title: 'Name', dataIndex: 'originalName' },
  { title: 'MIME', dataIndex: 'mimeType' },
  { title: 'Size Bytes', dataIndex: 'sizeBytes' },
  { title: 'Storage Key', dataIndex: 'storageKey' },
  { title: 'Checksum', dataIndex: 'checksum' },
  { title: 'Uploaded By', dataIndex: 'uploadedBy' },
  { title: 'Created At', dataIndex: 'createdAt' },
];

function createFilterOptions(
  rows: readonly FileAssetSummary[],
): CurrentPageFilterOption<FileAssetSummary>[] {
  return [
    {
      key: 'mimeType',
      options: createCurrentPageFilterOptions(rows, 'mimeType'),
      placeholder: 'MIME',
      predicate: (record, value) => record.mimeType === value,
    },
    {
      key: 'uploadedBy',
      options: createCurrentPageFilterOptions(rows, 'uploadedBy'),
      placeholder: 'Uploaded by',
      predicate: (record, value) => record.uploadedBy === value,
    },
  ];
}

function createDetailFields(record: FileAssetSummary): DetailField[] {
  return [
    { label: 'ID', value: record.id },
    { label: 'Name', value: record.originalName },
    { label: 'MIME', value: record.mimeType },
    { label: 'Size Bytes', value: record.sizeBytes },
    { label: 'Storage Key', value: record.storageKey },
    { label: 'Checksum', value: record.checksum },
    { label: 'Uploaded By', value: record.uploadedBy },
    { label: 'Created At', value: record.createdAt },
  ];
}

function formatBytes(sizeBytes: number): string {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  const kib = sizeBytes / 1024;
  if (kib < 1024) {
    return `${kib.toFixed(1)} KiB`;
  }

  return `${(kib / 1024).toFixed(1)} MiB`;
}

export default function FilesPage() {
  const [form] = Form.useForm<FileFormValues>();
  const [rows, setRows] = useState<readonly FileAssetSummary[]>(fallbackRows);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [selectedDetail, setSelectedDetail] = useState<FileAssetSummary>();
  const [editingFile, setEditingFile] = useState<FileAssetSummary>();
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const filterOptions = useMemo(() => createFilterOptions(rows), [rows]);
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<FileAssetSummary>({
      rows,
      searchFields,
      searchPlaceholder: 'Search files',
      selectFilters: filterOptions,
    });

  const loadFiles = async () => {
    setLoading(true);
    try {
      setRows(await listOpenCoreFiles());
      setLoadError(undefined);
    } catch (error: unknown) {
      setRows(fallbackRows);
      setLoadError(
        error instanceof Error ? error.message : 'Unable to load files.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFiles();
  }, []);

  const openCreateForm = () => {
    setEditingFile(undefined);
    form.setFieldsValue({
      checksum: '',
      mimeType: 'application/octet-stream',
      originalName: '',
      sizeBytes: 0,
      uploadedBy: 'admin',
    });
    setFormOpen(true);
  };

  const openEditForm = async (record: FileAssetSummary) => {
    try {
      const fresh = await getOpenCoreFile(record.id);
      setEditingFile(fresh);
      form.setFieldsValue({
        checksum: fresh.checksum,
        mimeType: fresh.mimeType,
        originalName: fresh.originalName,
        sizeBytes: fresh.sizeBytes,
        uploadedBy: fresh.uploadedBy,
      });
      setFormOpen(true);
    } catch (error: unknown) {
      message.error(
        error instanceof Error ? error.message : 'Unable to open file asset.',
      );
    }
  };

  const openDetail = async (record: FileAssetSummary) => {
    try {
      setSelectedDetail(await getOpenCoreFile(record.id));
    } catch (_error) {
      setSelectedDetail(record);
    }
  };

  const submitForm = async () => {
    const values = await form.validateFields();
    const body = {
      checksum: values.checksum?.trim() || undefined,
      mimeType: values.mimeType.trim(),
      originalName: values.originalName.trim(),
      uploadedBy: values.uploadedBy.trim(),
    };

    setSubmitting(true);
    try {
      if (editingFile) {
        await updateOpenCoreFile(editingFile.id, body);
        message.success('File asset updated.');
      } else {
        await createOpenCoreFile({
          ...body,
          sizeBytes: values.sizeBytes ?? 0,
        });
        message.success('File asset created.');
      }
      setFormOpen(false);
      setEditingFile(undefined);
      await loadFiles();
    } finally {
      setSubmitting(false);
    }
  };

  const deleteFile = async (record: FileAssetSummary) => {
    await deleteOpenCoreFile(record.id);
    message.success('File asset deleted.');
    await loadFiles();
  };

  const columns: ProColumns<FileAssetSummary>[] = [
    {
      title: 'Name',
      dataIndex: 'originalName',
      render: (_, record) => (
        <Typography.Link onClick={() => void openDetail(record)}>
          {record.originalName}
        </Typography.Link>
      ),
    },
    {
      title: 'MIME',
      dataIndex: 'mimeType',
      width: 184,
      render: (_, record) => <Tag>{record.mimeType}</Tag>,
    },
    {
      title: 'Size',
      dataIndex: 'sizeBytes',
      width: 112,
      render: (_, record) => (
        <Typography.Text>{formatBytes(record.sizeBytes)}</Typography.Text>
      ),
    },
    { title: 'Storage key', dataIndex: 'storageKey', ellipsis: true },
    { title: 'Uploaded by', dataIndex: 'uploadedBy', width: 128 },
    { title: 'Created at', dataIndex: 'createdAt', width: 192 },
    {
      title: 'Actions',
      valueType: 'option',
      width: 184,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Detail">
            <Button
              aria-label={`View ${record.originalName}`}
              icon={<EyeOutlined />}
              onClick={() => void openDetail(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="Edit metadata">
            <Button
              aria-label={`Edit ${record.originalName}`}
              icon={<EditOutlined />}
              onClick={() => void openEditForm(record)}
              size="small"
            />
          </Tooltip>
          <Popconfirm
            title="Delete this file asset?"
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => void deleteFile(record)}
          >
            <Tooltip title="Delete">
              <Button
                aria-label={`Delete ${record.originalName}`}
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
    <PageContainer title="File Center" subTitle="S7 System">
      {loadError ? (
        <Alert
          message="Using fallback file fixtures"
          description={loadError}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      ) : null}
      <ProTable<FileAssetSummary>
        columns={columns}
        dataSource={filteredRows}
        loading={loading}
        options={false}
        pagination={{ pageSize: 10 }}
        rowKey="id"
        search={false}
        toolBarRender={() => [
          filterToolbar,
          <CurrentPageExportButton
            columns={exportColumns}
            filename="opencore-files.csv"
            key="export"
            resource="core-files"
            rows={filteredRows}
          />,
          <Tooltip key="refresh" title="Reload">
            <Button
              aria-label="Reload files"
              icon={<ReloadOutlined />}
              onClick={() => void loadFiles()}
            />
          </Tooltip>,
          <Button
            icon={<PlusOutlined />}
            key="create"
            onClick={openCreateForm}
            type="primary"
          >
            New File Asset
          </Button>,
        ]}
      />
      <ReadOnlyDetailDrawer
        fields={selectedDetail ? createDetailFields(selectedDetail) : []}
        onClose={() => setSelectedDetail(undefined)}
        open={Boolean(selectedDetail)}
        title={selectedDetail?.originalName ?? 'File Asset Detail'}
      />
      <Modal
        confirmLoading={submitting}
        destroyOnHidden
        onCancel={() => {
          setFormOpen(false);
          setEditingFile(undefined);
        }}
        onOk={() => void submitForm()}
        open={formOpen}
        title={editingFile ? 'Edit File Asset' : 'Create File Asset'}
      >
        <Form<FileFormValues> form={form} layout="vertical">
          <Form.Item
            label="Name"
            name="originalName"
            rules={[{ required: true, message: 'Enter a file name.' }]}
          >
            <Input placeholder="handbook.pdf" />
          </Form.Item>
          <Form.Item
            label="MIME"
            name="mimeType"
            rules={[{ required: true, message: 'Enter a MIME type.' }]}
          >
            <Input placeholder="application/pdf" />
          </Form.Item>
          <Form.Item
            label="Size bytes"
            name="sizeBytes"
            rules={
              editingFile
                ? []
                : [{ required: true, message: 'Enter a file size.' }]
            }
          >
            <InputNumber
              disabled={Boolean(editingFile)}
              min={0}
              precision={0}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item label="Checksum" name="checksum">
            <Input placeholder="sha256:..." />
          </Form.Item>
          <Form.Item
            label="Uploaded by"
            name="uploadedBy"
            rules={[{ required: true, message: 'Enter an uploader.' }]}
          >
            <Input placeholder="admin" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
