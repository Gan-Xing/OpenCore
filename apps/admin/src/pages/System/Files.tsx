import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  ReloadOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import type { FileAssetSummary } from '@opencore/sdk';
import { useIntl } from '@umijs/max';
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
  Upload,
  message,
} from 'antd';
import { useMemo, useEffect, useState } from 'react';
import {
  deleteOpenCoreFile,
  downloadOpenCoreFile,
  getOpenCoreFile,
  listOpenCoreFiles,
  updateOpenCoreFile,
  uploadOpenCoreFile,
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

const searchFields: CurrentPageSearchField<FileAssetSummary>[] = [
  'originalName',
  'mimeType',
  'storageKey',
  'tenantId',
  'uploadedBy',
  'checksum',
];

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

function readFileContentBase64(
  file: File,
  failureMessage: string,
  unexpectedResultMessage: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(failureMessage));
    reader.onload = () => {
      const result = reader.result;

      if (typeof result !== 'string') {
        reject(new Error(unexpectedResultMessage));
        return;
      }

      resolve(
        result.includes(',') ? result.slice(result.indexOf(',') + 1) : result,
      );
    };
    reader.readAsDataURL(file);
  });
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export default function FilesPage() {
  const intl = useIntl();
  const [form] = Form.useForm<FileFormValues>();
  const [rows, setRows] = useState<readonly FileAssetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [selectedDetail, setSelectedDetail] = useState<FileAssetSummary>();
  const [editingFile, setEditingFile] = useState<FileAssetSummary>();
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedUploadFile, setSelectedUploadFile] = useState<File>();
  const formatMessage = (
    id: string,
    defaultMessage: string,
    values?: Record<string, number | string>,
  ) =>
    values
      ? intl.formatMessage({ id, defaultMessage }, values)
      : intl.formatMessage({ id, defaultMessage });
  const filterOptions = useMemo<CurrentPageFilterOption<FileAssetSummary>[]>(
    () => [
      {
        key: 'mimeType',
        options: createCurrentPageFilterOptions(rows, 'mimeType'),
        placeholder: formatMessage('pages.system.files.fields.mime', 'MIME'),
        predicate: (record, value) => record.mimeType === value,
      },
      {
        key: 'uploadedBy',
        options: createCurrentPageFilterOptions(rows, 'uploadedBy'),
        placeholder: formatMessage(
          'pages.system.files.fields.uploadedBy',
          'Uploaded by',
        ),
        predicate: (record, value) => record.uploadedBy === value,
      },
    ],
    [rows, intl],
  );
  const exportColumns: CurrentPageExportColumn<FileAssetSummary>[] = [
    {
      title: formatMessage('pages.system.files.fields.id', 'ID'),
      dataIndex: 'id',
    },
    {
      title: formatMessage('pages.system.files.fields.tenantId', 'Tenant ID'),
      dataIndex: 'tenantId',
    },
    {
      title: formatMessage('pages.system.files.fields.name', 'Name'),
      dataIndex: 'originalName',
    },
    {
      title: formatMessage('pages.system.files.fields.mime', 'MIME'),
      dataIndex: 'mimeType',
    },
    {
      title: formatMessage('pages.system.files.fields.sizeBytes', 'Size Bytes'),
      dataIndex: 'sizeBytes',
    },
    {
      title: formatMessage(
        'pages.system.files.fields.storageKey',
        'Storage Key',
      ),
      dataIndex: 'storageKey',
    },
    {
      title: formatMessage('pages.system.files.fields.checksum', 'Checksum'),
      dataIndex: 'checksum',
    },
    {
      title: formatMessage(
        'pages.system.files.fields.uploadedBy',
        'Uploaded By',
      ),
      dataIndex: 'uploadedBy',
    },
    {
      title: formatMessage('pages.system.files.fields.createdAt', 'Created At'),
      dataIndex: 'createdAt',
    },
  ];
  const createDetailFields = (record: FileAssetSummary): DetailField[] => [
    {
      label: formatMessage('pages.system.files.fields.id', 'ID'),
      value: record.id,
    },
    {
      label: formatMessage('pages.system.files.fields.tenantId', 'Tenant ID'),
      value: record.tenantId,
    },
    {
      label: formatMessage('pages.system.files.fields.name', 'Name'),
      value: record.originalName,
    },
    {
      label: formatMessage('pages.system.files.fields.mime', 'MIME'),
      value: record.mimeType,
    },
    {
      label: formatMessage('pages.system.files.fields.sizeBytes', 'Size Bytes'),
      value: record.sizeBytes,
    },
    {
      label: formatMessage(
        'pages.system.files.fields.storageKey',
        'Storage Key',
      ),
      value: record.storageKey,
    },
    {
      label: formatMessage('pages.system.files.fields.checksum', 'Checksum'),
      value: record.checksum,
    },
    {
      label: formatMessage(
        'pages.system.files.fields.uploadedBy',
        'Uploaded By',
      ),
      value: record.uploadedBy,
    },
    {
      label: formatMessage('pages.system.files.fields.createdAt', 'Created At'),
      value: record.createdAt,
    },
  ];
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<FileAssetSummary>({
      rows,
      searchFields,
      searchPlaceholder: formatMessage(
        'pages.system.files.search.placeholder',
        'Search files',
      ),
      selectFilters: filterOptions,
    });

  const loadFiles = async () => {
    setLoading(true);
    try {
      setRows(await listOpenCoreFiles());
      setLoadError(undefined);
    } catch (error: unknown) {
      setRows([]);
      setSelectedDetail(undefined);
      setEditingFile(undefined);
      setSelectedUploadFile(undefined);
      setFormOpen(false);
      setLoadError(
        getErrorMessage(
          error,
          formatMessage(
            'pages.system.files.load.failure',
            'Unable to load live files.',
          ),
        ),
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
    setSelectedUploadFile(undefined);
    form.setFieldsValue({
      checksum: '',
      mimeType: 'application/octet-stream',
      originalName: '',
      sizeBytes: undefined,
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
        getErrorMessage(
          error,
          formatMessage(
            'pages.system.files.detail.loadFailure',
            'Unable to load live file detail.',
          ),
        ),
      );
    }
  };

  const openDetail = async (record: FileAssetSummary) => {
    try {
      setSelectedDetail(await getOpenCoreFile(record.id));
    } catch (error: unknown) {
      setSelectedDetail(undefined);
      message.error(
        getErrorMessage(
          error,
          formatMessage(
            'pages.system.files.detail.loadFailure',
            'Unable to load live file detail.',
          ),
        ),
      );
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
        message.success(
          formatMessage(
            'pages.system.files.messages.updated',
            'File asset updated.',
          ),
        );
      } else {
        if (!selectedUploadFile) {
          message.error(
            formatMessage(
              'pages.system.files.messages.chooseFile',
              'Choose a file to upload.',
            ),
          );
          return;
        }

        await uploadOpenCoreFile({
          ...body,
          contentBase64: await readFileContentBase64(
            selectedUploadFile,
            formatMessage(
              'pages.system.files.messages.readFailure',
              'Unable to read file content.',
            ),
            formatMessage(
              'pages.system.files.messages.unexpectedReaderResult',
              'Unexpected file reader result.',
            ),
          ),
        });
        message.success(
          formatMessage(
            'pages.system.files.messages.uploaded',
            'File uploaded.',
          ),
        );
      }
      setFormOpen(false);
      setEditingFile(undefined);
      setSelectedUploadFile(undefined);
      await loadFiles();
    } finally {
      setSubmitting(false);
    }
  };

  const deleteFile = async (record: FileAssetSummary) => {
    await deleteOpenCoreFile(record.id);
    message.success(
      formatMessage(
        'pages.system.files.messages.deleted',
        'File asset deleted.',
      ),
    );
    await loadFiles();
  };

  const downloadFile = async (record: FileAssetSummary) => {
    const downloaded = await downloadOpenCoreFile(record.id);
    const objectUrl = URL.createObjectURL(downloaded.blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = downloaded.filename ?? record.originalName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
    message.success(
      formatMessage(
        'pages.system.files.messages.downloaded',
        'File downloaded.',
      ),
    );
  };

  const columns: ProColumns<FileAssetSummary>[] = [
    {
      title: formatMessage('pages.system.files.fields.name', 'Name'),
      dataIndex: 'originalName',
      render: (_, record) => (
        <Typography.Link onClick={() => void openDetail(record)}>
          {record.originalName}
        </Typography.Link>
      ),
    },
    {
      title: formatMessage('pages.system.files.fields.tenantId', 'Tenant ID'),
      dataIndex: 'tenantId',
      width: 160,
      ellipsis: true,
    },
    {
      title: formatMessage('pages.system.files.fields.mime', 'MIME'),
      dataIndex: 'mimeType',
      width: 184,
      render: (_, record) => <Tag>{record.mimeType}</Tag>,
    },
    {
      title: formatMessage('pages.system.files.fields.size', 'Size'),
      dataIndex: 'sizeBytes',
      width: 112,
      render: (_, record) => (
        <Typography.Text>{formatBytes(record.sizeBytes)}</Typography.Text>
      ),
    },
    {
      title: formatMessage(
        'pages.system.files.fields.storageKey',
        'Storage key',
      ),
      dataIndex: 'storageKey',
      ellipsis: true,
    },
    {
      title: formatMessage(
        'pages.system.files.fields.uploadedBy',
        'Uploaded by',
      ),
      dataIndex: 'uploadedBy',
      width: 128,
    },
    {
      title: formatMessage('pages.system.files.fields.createdAt', 'Created at'),
      dataIndex: 'createdAt',
      width: 192,
    },
    {
      title: formatMessage('pages.system.files.actions.column', 'Actions'),
      valueType: 'option',
      width: 224,
      render: (_, record) => (
        <Space size="small">
          <Tooltip
            title={formatMessage(
              'pages.system.files.actions.download',
              'Download',
            )}
          >
            <Button
              aria-label={formatMessage(
                'pages.system.files.actions.downloadAria',
                'Download {name}',
                { name: record.originalName },
              )}
              icon={<DownloadOutlined />}
              onClick={() => void downloadFile(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip
            title={formatMessage('pages.system.files.actions.detail', 'Detail')}
          >
            <Button
              aria-label={formatMessage(
                'pages.system.files.actions.viewAria',
                'View {name}',
                { name: record.originalName },
              )}
              icon={<EyeOutlined />}
              onClick={() => void openDetail(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip
            title={formatMessage(
              'pages.system.files.actions.editMetadata',
              'Edit metadata',
            )}
          >
            <Button
              aria-label={formatMessage(
                'pages.system.files.actions.editAria',
                'Edit {name}',
                { name: record.originalName },
              )}
              icon={<EditOutlined />}
              onClick={() => void openEditForm(record)}
              size="small"
            />
          </Tooltip>
          <Popconfirm
            title={formatMessage(
              'pages.system.files.confirm.deleteOne',
              'Delete this file asset?',
            )}
            okText={formatMessage(
              'pages.system.files.actions.delete',
              'Delete',
            )}
            okButtonProps={{ danger: true }}
            onConfirm={() => void deleteFile(record)}
          >
            <Tooltip
              title={formatMessage(
                'pages.system.files.actions.delete',
                'Delete',
              )}
            >
              <Button
                aria-label={formatMessage(
                  'pages.system.files.actions.deleteAria',
                  'Delete {name}',
                  { name: record.originalName },
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

  return (
    <PageContainer
      title={formatMessage('menu.system.files', 'File Center')}
      subTitle={formatMessage('pages.system.section', 'System Management')}
    >
      {loadError ? (
        <Alert
          message={formatMessage(
            'pages.system.files.load.liveFailure',
            'Unable to load live files',
          )}
          description={loadError}
          type="error"
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
          <Tooltip
            key="refresh"
            title={formatMessage('pages.system.files.actions.reload', 'Reload')}
          >
            <Button
              aria-label={formatMessage(
                'pages.system.files.actions.reloadAria',
                'Reload files',
              )}
              icon={<ReloadOutlined />}
              onClick={() => void loadFiles()}
            />
          </Tooltip>,
          <Button
            icon={<UploadOutlined />}
            key="create"
            onClick={openCreateForm}
            type="primary"
          >
            {formatMessage('pages.system.files.actions.upload', 'Upload File')}
          </Button>,
        ]}
      />
      <ReadOnlyDetailDrawer
        fields={selectedDetail ? createDetailFields(selectedDetail) : []}
        onClose={() => setSelectedDetail(undefined)}
        open={Boolean(selectedDetail)}
        title={
          selectedDetail?.originalName ??
          formatMessage('pages.system.files.detail.title', 'File Asset Detail')
        }
      />
      <Modal
        confirmLoading={submitting}
        destroyOnHidden
        onCancel={() => {
          setFormOpen(false);
          setEditingFile(undefined);
          setSelectedUploadFile(undefined);
        }}
        onOk={() => void submitForm()}
        open={formOpen}
        okText={
          editingFile
            ? formatMessage('pages.system.files.actions.save', 'Save')
            : formatMessage('pages.system.files.actions.upload', 'Upload')
        }
        title={
          editingFile
            ? formatMessage(
                'pages.system.files.form.editTitle',
                'Edit File Asset',
              )
            : formatMessage(
                'pages.system.files.form.uploadTitle',
                'Upload File',
              )
        }
      >
        <Form<FileFormValues> form={form} layout="vertical">
          {!editingFile ? (
            <Form.Item
              label={formatMessage('pages.system.files.fields.file', 'File')}
              required
            >
              <Upload
                beforeUpload={(file) => {
                  setSelectedUploadFile(file);
                  form.setFieldsValue({
                    mimeType: file.type || 'application/octet-stream',
                    originalName: file.name,
                    sizeBytes: file.size,
                  });
                  return false;
                }}
                maxCount={1}
                onRemove={() => {
                  setSelectedUploadFile(undefined);
                  form.setFieldsValue({
                    mimeType: 'application/octet-stream',
                    originalName: '',
                    sizeBytes: undefined,
                  });
                }}
              >
                <Button icon={<UploadOutlined />}>
                  {formatMessage(
                    'pages.system.files.actions.chooseFile',
                    'Choose file',
                  )}
                </Button>
              </Upload>
            </Form.Item>
          ) : null}
          <Form.Item
            label={formatMessage('pages.system.files.fields.name', 'Name')}
            name="originalName"
            rules={[
              {
                required: true,
                message: formatMessage(
                  'pages.system.files.validation.nameRequired',
                  'Enter a file name.',
                ),
              },
            ]}
          >
            <Input
              placeholder={formatMessage(
                'pages.system.files.placeholders.name',
                'handbook.pdf',
              )}
            />
          </Form.Item>
          <Form.Item
            label={formatMessage('pages.system.files.fields.mime', 'MIME')}
            name="mimeType"
            rules={[
              {
                required: true,
                message: formatMessage(
                  'pages.system.files.validation.mimeRequired',
                  'Enter a MIME type.',
                ),
              },
            ]}
          >
            <Input
              placeholder={formatMessage(
                'pages.system.files.placeholders.mime',
                'application/pdf',
              )}
            />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              'pages.system.files.fields.sizeBytes',
              'Size bytes',
            )}
            name="sizeBytes"
            rules={
              editingFile
                ? []
                : [
                    {
                      required: true,
                      message: formatMessage(
                        'pages.system.files.validation.sizeRequired',
                        'Enter a file size.',
                      ),
                    },
                  ]
            }
          >
            <InputNumber
              disabled
              min={0}
              precision={0}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              'pages.system.files.fields.checksum',
              'Checksum',
            )}
            name="checksum"
          >
            <Input
              placeholder={formatMessage(
                'pages.system.files.placeholders.checksum',
                'sha256:...',
              )}
            />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              'pages.system.files.fields.uploadedBy',
              'Uploaded by',
            )}
            name="uploadedBy"
            rules={[
              {
                required: true,
                message: formatMessage(
                  'pages.system.files.validation.uploadedByRequired',
                  'Enter an uploader.',
                ),
              },
            ]}
          >
            <Input
              placeholder={formatMessage(
                'pages.system.files.placeholders.uploadedBy',
                'admin',
              )}
            />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
