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
import { history, useModel } from '@umijs/max';
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

function renderTags(values: readonly string[]) {
  if (values.length === 0) {
    return <Typography.Text type="secondary">None</Typography.Text>;
  }

  return (
    <Space size={[4, 4]} wrap>
      {values.map((value) => (
        <Tag key={value}>{value}</Tag>
      ))}
    </Space>
  );
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener('load', () => {
      const result = reader.result;

      if (typeof result !== 'string') {
        reject(new Error('Unable to read avatar file.'));
        return;
      }

      const commaIndex = result.indexOf(',');

      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    });
    reader.addEventListener('error', () => {
      reject(reader.error ?? new Error('Unable to read avatar file.'));
    });
    reader.readAsDataURL(file);
  });
}

export default function PersonalProfilePage() {
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
        error instanceof Error ? error.message : 'Unable to load profile.',
      );
    } finally {
      setLoading(false);
    }
  }, [form, initialState?.currentUser]);

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
      message.success('Profile saved.');
    } catch (error: unknown) {
      message.error(
        error instanceof Error ? error.message : 'Unable to save profile.',
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
      message.error('Avatar must be PNG, JPEG, WebP or GIF.');
      return;
    }

    if (file.size > AVATAR_MAX_BYTES) {
      message.error('Avatar must be 1 MB or smaller.');
      return;
    }

    setUploadingAvatar(true);
    try {
      const updated = await updateOpenCoreUserAvatar({
        originalName: file.name,
        mimeType: file.type,
        contentBase64: await readFileAsBase64(file),
      });
      setProfile(updated);
      form.setFieldsValue({ displayName: updated.displayName });
      syncCurrentUserProfile(updated);
      setLoadError(undefined);
      message.success('Avatar updated.');
    } catch (error: unknown) {
      message.error(
        error instanceof Error ? error.message : 'Unable to update avatar.',
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
      message.success('Avatar removed.');
    } catch (error: unknown) {
      message.error(
        error instanceof Error ? error.message : 'Unable to remove avatar.',
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
        `Password changed. ${result.revokedSessionCount} active session(s) revoked. Sign in again.`,
      );
      history.replace({
        pathname: '/user/login',
        search: new URLSearchParams({
          redirect: '/personal/profile',
        }).toString(),
      });
    } catch (error: unknown) {
      message.error(
        error instanceof Error ? error.message : 'Unable to change password.',
      );
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <PageContainer
      title="Profile"
      extra={[
        <Button
          key="reload"
          icon={<ReloadOutlined />}
          onClick={() => void loadProfile()}
        >
          Reload
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
                {profile?.username ?? 'unknown'}
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
              Upload avatar
            </Button>
            <Button
              danger
              disabled={!profile?.avatarUrl}
              icon={<DeleteOutlined />}
              loading={deletingAvatar}
              onClick={() => void handleDeleteAvatar()}
            >
              Remove avatar
            </Button>
          </Space>
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="User ID">
              {profile?.id ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Username">
              {profile?.username ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Department">
              {profile?.deptId ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Roles">
              {renderTags(profile?.roleCodes ?? [])}
            </Descriptions.Item>
            <Descriptions.Item label="Posts">
              {renderTags(profile?.postCodes ?? [])}
            </Descriptions.Item>
          </Descriptions>
        </section>

        <section style={profilePanelStyle}>
          {loadError ? (
            <Alert
              type="warning"
              showIcon
              message="Profile data is using the current session fallback."
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
              label="Display name"
              name="displayName"
              rules={[
                { required: true, message: 'Display name is required.' },
                {
                  max: 80,
                  message: 'Display name must be 80 characters or fewer.',
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
              Save
            </Button>
          </Form>
        </section>

        <section style={profilePanelStyle}>
          <Typography.Title level={5} style={{ marginTop: 0 }}>
            Change password
          </Typography.Title>
          <Form<PasswordFormValues>
            form={passwordForm}
            layout="vertical"
            onFinish={() => void handlePasswordChange()}
          >
            <Form.Item
              label="Current password"
              name="oldPassword"
              rules={[
                { required: true, message: 'Current password is required.' },
              ]}
            >
              <Input.Password autoComplete="current-password" />
            </Form.Item>
            <Form.Item
              label="New password"
              name="newPassword"
              dependencies={['oldPassword']}
              rules={[
                { required: true, message: 'New password is required.' },
                {
                  min: 6,
                  message: 'New password must be at least 6 characters.',
                },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || value !== getFieldValue('oldPassword')) {
                      return Promise.resolve();
                    }

                    return Promise.reject(
                      new Error(
                        'New password must be different from current password.',
                      ),
                    );
                  },
                }),
              ]}
            >
              <Input.Password autoComplete="new-password" />
            </Form.Item>
            <Form.Item
              label="Confirm password"
              name="confirmPassword"
              dependencies={['newPassword']}
              rules={[
                { required: true, message: 'Confirm password is required.' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || value === getFieldValue('newPassword')) {
                      return Promise.resolve();
                    }

                    return Promise.reject(
                      new Error('The two passwords do not match.'),
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
              Change password
            </Button>
          </Form>
        </section>
      </div>
    </PageContainer>
  );
}
