import {
  DeleteOutlined,
  LockOutlined,
  ReloadOutlined,
  SaveOutlined,
  UploadOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import type { UserProfileSummary } from '@opencore/sdk';
import { history, useIntl, useModel } from '@umijs/max';
import {
  Alert,
  Avatar,
  Button,
  Descriptions,
  Form,
  Input,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ChangeEvent, CSSProperties } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  deleteOpenCoreUserAvatar,
  getOpenCoreUserProfile,
  updateOpenCoreUserAvatar,
  updateOpenCoreUserPassword,
  updateOpenCoreUserProfile,
} from '@/services/opencore/auth';
import { removeAdminToken } from '@/services/opencore/token';

type ProfileFormValues = {
  displayName: string;
};

type PasswordFormValues = {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type FormatMessage = (
  id: string,
  defaultMessage: string,
  values?: Record<string, number | string>,
) => string;

const profileLayoutStyle: CSSProperties = {
  display: 'grid',
  gap: 16,
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
  alignItems: 'start',
};

const profilePanelStyle: CSSProperties = {
  border: '1px solid rgba(5, 5, 5, 0.08)',
  borderRadius: 8,
  background: '#fff',
  padding: 20,
};

const identityHeaderStyle: CSSProperties = {
  display: 'flex',
  gap: 12,
  alignItems: 'center',
  marginBottom: 20,
};

const AVATAR_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif';
const AVATAR_MAX_BYTES = 1_048_576;
const AVATAR_MIME_TYPES = new Set(AVATAR_ACCEPT.split(','));

function renderTags(values: readonly string[], emptyText: string) {
  if (values.length === 0) {
    return <Typography.Text type="secondary">{emptyText}</Typography.Text>;
  }

  return (
    <Space size={[4, 4]} wrap>
      {values.map((value) => (
        <Tag key={value}>{value}</Tag>
      ))}
    </Space>
  );
}

function readFileAsBase64(
  file: File,
  formatMessage: FormatMessage,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener('load', () => {
      const result = reader.result;

      if (typeof result !== 'string') {
        reject(
          new Error(
            formatMessage(
              'pages.personal.profile.avatar.readFailure',
              'Unable to read avatar file.',
            ),
          ),
        );
        return;
      }

      const commaIndex = result.indexOf(',');

      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    });
    reader.addEventListener('error', () => {
      reject(
        reader.error ??
          new Error(
            formatMessage(
              'pages.personal.profile.avatar.readFailure',
              'Unable to read avatar file.',
            ),
          ),
      );
    });
    reader.readAsDataURL(file);
  });
}

export default function PersonalProfilePage() {
  const intl = useIntl();
  const [form] = Form.useForm<ProfileFormValues>();
  const [passwordForm] = Form.useForm<PasswordFormValues>();
  const { initialState, setInitialState } = useModel('@@initialState');
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<UserProfileSummary>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [deletingAvatar, setDeletingAvatar] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [loadError, setLoadError] = useState<string>();
  const formatMessage: FormatMessage = useCallback(
    (id, defaultMessage, values) =>
      values
        ? intl.formatMessage({ id, defaultMessage }, values)
        : intl.formatMessage({ id, defaultMessage }),
    [intl],
  );

  const syncCurrentUserProfile = useCallback(
    (updated: UserProfileSummary) => {
      setInitialState((state) =>
        state
          ? {
              ...state,
              currentUser: state.currentUser
                ? {
                    ...state.currentUser,
                    avatar: updated.avatarUrl,
                    avatarUrl: updated.avatarUrl,
                    displayName: updated.displayName,
                    name: updated.displayName,
                  }
                : state.currentUser,
            }
          : state,
      );
    },
    [setInitialState],
  );

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const nextProfile = await getOpenCoreUserProfile();
      setProfile(nextProfile);
      form.setFieldsValue({ displayName: nextProfile.displayName });
      setLoadError(undefined);
    } catch (error: unknown) {
      const fallback = initialState?.currentUser
        ? {
            id: initialState.currentUser.id,
            username: initialState.currentUser.username,
            displayName: initialState.currentUser.displayName,
            roleCodes: initialState.currentUser.roleCodes,
            avatarUrl:
              initialState.currentUser.avatarUrl ??
              initialState.currentUser.avatar,
            postCodes: [],
            enabled: true,
            system: false,
          }
        : undefined;

      if (fallback) {
        setProfile(fallback);
        form.setFieldsValue({ displayName: fallback.displayName });
      }
      setLoadError(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.personal.profile.load.failure',
              'Unable to load profile.',
            ),
      );
    } finally {
      setLoading(false);
    }
  }, [form, formatMessage, initialState?.currentUser]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const updated = await updateOpenCoreUserProfile({
        displayName: values.displayName,
      });
      setProfile(updated);
      form.setFieldsValue({ displayName: updated.displayName });
      syncCurrentUserProfile(updated);
      setLoadError(undefined);
      message.success(
        formatMessage(
          'pages.personal.profile.messages.saved',
          'Profile saved.',
        ),
      );
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.personal.profile.messages.saveFailure',
              'Unable to save profile.',
            ),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarFileChange = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!AVATAR_MIME_TYPES.has(file.type)) {
      message.error(
        formatMessage(
          'pages.personal.profile.avatar.invalidType',
          'Avatar must be PNG, JPEG, WebP or GIF.',
        ),
      );
      return;
    }

    if (file.size > AVATAR_MAX_BYTES) {
      message.error(
        formatMessage(
          'pages.personal.profile.avatar.tooLarge',
          'Avatar must be 1 MB or smaller.',
        ),
      );
      return;
    }

    setUploadingAvatar(true);
    try {
      const updated = await updateOpenCoreUserAvatar({
        originalName: file.name,
        mimeType: file.type,
        contentBase64: await readFileAsBase64(file, formatMessage),
      });
      setProfile(updated);
      form.setFieldsValue({ displayName: updated.displayName });
      syncCurrentUserProfile(updated);
      setLoadError(undefined);
      message.success(
        formatMessage(
          'pages.personal.profile.messages.avatarUpdated',
          'Avatar updated.',
        ),
      );
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.personal.profile.messages.avatarUpdateFailure',
              'Unable to update avatar.',
            ),
      );
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleDeleteAvatar = async () => {
    setDeletingAvatar(true);
    try {
      const updated = await deleteOpenCoreUserAvatar();
      setProfile(updated);
      form.setFieldsValue({ displayName: updated.displayName });
      syncCurrentUserProfile(updated);
      setLoadError(undefined);
      message.success(
        formatMessage(
          'pages.personal.profile.messages.avatarRemoved',
          'Avatar removed.',
        ),
      );
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.personal.profile.messages.avatarRemoveFailure',
              'Unable to remove avatar.',
            ),
      );
    } finally {
      setDeletingAvatar(false);
    }
  };

  const handlePasswordChange = async () => {
    const values = await passwordForm.validateFields();
    setChangingPassword(true);
    try {
      const result = await updateOpenCoreUserPassword({
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      });
      passwordForm.resetFields();
      removeAdminToken();
      setInitialState((state) =>
        state
          ? {
              ...state,
              currentUser: undefined,
              permissions: [],
            }
          : state,
      );
      message.success(
        formatMessage(
          'pages.personal.profile.messages.passwordChanged',
          'Password changed. {count} active session(s) revoked. Sign in again.',
          { count: result.revokedSessionCount },
        ),
      );
      history.replace({
        pathname: '/user/login',
        search: new URLSearchParams({
          redirect: '/personal/profile',
        }).toString(),
      });
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.personal.profile.messages.passwordChangeFailure',
              'Unable to change password.',
            ),
      );
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <PageContainer
      title={formatMessage('pages.personal.profile.title', 'Profile')}
      extra={[
        <Button
          key="reload"
          icon={<ReloadOutlined />}
          onClick={() => void loadProfile()}
        >
          {formatMessage('pages.personal.profile.actions.reload', 'Reload')}
        </Button>,
      ]}
    >
      <div style={profileLayoutStyle}>
        <section style={profilePanelStyle}>
          <div style={identityHeaderStyle}>
            <Avatar
              size={56}
              src={profile?.avatarUrl}
              icon={profile?.avatarUrl ? undefined : <UserOutlined />}
            />
            <div>
              <Typography.Title level={4} style={{ margin: 0 }}>
                {profile?.displayName ?? 'OpenCore User'}
              </Typography.Title>
              <Typography.Text type="secondary">
                {profile?.username ??
                  formatMessage(
                    'pages.personal.profile.status.unknown',
                    'unknown',
                  )}
              </Typography.Text>
            </div>
          </div>
          <input
            ref={avatarInputRef}
            type="file"
            accept={AVATAR_ACCEPT}
            style={{ display: 'none' }}
            onChange={(event) => void handleAvatarFileChange(event)}
          />
          <Space style={{ marginBottom: 16 }} wrap>
            <Button
              icon={<UploadOutlined />}
              loading={uploadingAvatar}
              onClick={() => avatarInputRef.current?.click()}
            >
              {formatMessage(
                'pages.personal.profile.actions.uploadAvatar',
                'Upload avatar',
              )}
            </Button>
            <Button
              danger
              disabled={!profile?.avatarUrl}
              icon={<DeleteOutlined />}
              loading={deletingAvatar}
              onClick={() => void handleDeleteAvatar()}
            >
              {formatMessage(
                'pages.personal.profile.actions.removeAvatar',
                'Remove avatar',
              )}
            </Button>
          </Space>
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item
              label={formatMessage(
                'pages.personal.profile.fields.userId',
                'User ID',
              )}
            >
              {profile?.id ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item
              label={formatMessage(
                'pages.personal.profile.fields.username',
                'Username',
              )}
            >
              {profile?.username ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item
              label={formatMessage(
                'pages.personal.profile.fields.department',
                'Department',
              )}
            >
              {profile?.deptId ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item
              label={formatMessage(
                'pages.personal.profile.fields.roles',
                'Roles',
              )}
            >
              {renderTags(
                profile?.roleCodes ?? [],
                formatMessage('pages.personal.profile.status.none', 'None'),
              )}
            </Descriptions.Item>
            <Descriptions.Item
              label={formatMessage(
                'pages.personal.profile.fields.posts',
                'Posts',
              )}
            >
              {renderTags(
                profile?.postCodes ?? [],
                formatMessage('pages.personal.profile.status.none', 'None'),
              )}
            </Descriptions.Item>
          </Descriptions>
        </section>

        <section style={profilePanelStyle}>
          {loadError ? (
            <Alert
              type="warning"
              showIcon
              message={formatMessage(
                'pages.personal.profile.load.sessionFallback',
                'Profile data is using the current session fallback.',
              )}
              description={loadError}
              style={{ marginBottom: 16 }}
            />
          ) : null}
          <Form<ProfileFormValues>
            form={form}
            layout="vertical"
            disabled={loading}
            onFinish={() => void handleSave()}
          >
            <Form.Item
              label={formatMessage(
                'pages.personal.profile.fields.displayName',
                'Display name',
              )}
              name="displayName"
              rules={[
                {
                  required: true,
                  message: formatMessage(
                    'pages.personal.profile.validation.displayNameRequired',
                    'Display name is required.',
                  ),
                },
                {
                  max: 80,
                  message: formatMessage(
                    'pages.personal.profile.validation.displayNameMax',
                    'Display name must be 80 characters or fewer.',
                  ),
                },
              ]}
            >
              <Input maxLength={80} autoComplete="name" />
            </Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={saving}
            >
              {formatMessage('pages.personal.profile.actions.save', 'Save')}
            </Button>
          </Form>
        </section>

        <section style={profilePanelStyle}>
          <Typography.Title level={5} style={{ marginTop: 0 }}>
            {formatMessage(
              'pages.personal.profile.password.title',
              'Change password',
            )}
          </Typography.Title>
          <Form<PasswordFormValues>
            form={passwordForm}
            layout="vertical"
            onFinish={() => void handlePasswordChange()}
          >
            <Form.Item
              label={formatMessage(
                'pages.personal.profile.password.current',
                'Current password',
              )}
              name="oldPassword"
              rules={[
                {
                  required: true,
                  message: formatMessage(
                    'pages.personal.profile.validation.currentPasswordRequired',
                    'Current password is required.',
                  ),
                },
              ]}
            >
              <Input.Password autoComplete="current-password" />
            </Form.Item>
            <Form.Item
              label={formatMessage(
                'pages.personal.profile.password.new',
                'New password',
              )}
              name="newPassword"
              dependencies={['oldPassword']}
              rules={[
                {
                  required: true,
                  message: formatMessage(
                    'pages.personal.profile.validation.newPasswordRequired',
                    'New password is required.',
                  ),
                },
                {
                  min: 6,
                  message: formatMessage(
                    'pages.personal.profile.validation.newPasswordMin',
                    'New password must be at least 6 characters.',
                  ),
                },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || value !== getFieldValue('oldPassword')) {
                      return Promise.resolve();
                    }

                    return Promise.reject(
                      new Error(
                        formatMessage(
                          'pages.personal.profile.validation.newPasswordDifferent',
                          'New password must be different from current password.',
                        ),
                      ),
                    );
                  },
                }),
              ]}
            >
              <Input.Password autoComplete="new-password" />
            </Form.Item>
            <Form.Item
              label={formatMessage(
                'pages.personal.profile.password.confirm',
                'Confirm password',
              )}
              name="confirmPassword"
              dependencies={['newPassword']}
              rules={[
                {
                  required: true,
                  message: formatMessage(
                    'pages.personal.profile.validation.confirmPasswordRequired',
                    'Confirm password is required.',
                  ),
                },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || value === getFieldValue('newPassword')) {
                      return Promise.resolve();
                    }

                    return Promise.reject(
                      new Error(
                        formatMessage(
                          'pages.personal.profile.validation.passwordMismatch',
                          'The two passwords do not match.',
                        ),
                      ),
                    );
                  },
                }),
              ]}
            >
              <Input.Password autoComplete="new-password" />
            </Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              icon={<LockOutlined />}
              loading={changingPassword}
            >
              {formatMessage(
                'pages.personal.profile.actions.changePassword',
                'Change password',
              )}
            </Button>
          </Form>
        </section>
      </div>
    </PageContainer>
  );
}
