import { ReloadOutlined, SaveOutlined, UserOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import type { UserProfileSummary } from '@opencore/sdk';
import { useModel } from '@umijs/max';
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
import type { CSSProperties } from 'react';
import { useCallback, useEffect, useState } from 'react';
import {
  getOpenCoreUserProfile,
  updateOpenCoreUserProfile,
} from '@/services/opencore/auth';

type ProfileFormValues = {
  displayName: string;
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

export default function PersonalProfilePage() {
  const [form] = Form.useForm<ProfileFormValues>();
  const { initialState, setInitialState } = useModel('@@initialState');
  const [profile, setProfile] = useState<UserProfileSummary>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string>();

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
      setInitialState((state) =>
        state
          ? {
              ...state,
              currentUser: state.currentUser
                ? {
                    ...state.currentUser,
                    displayName: updated.displayName,
                    name: updated.displayName,
                  }
                : state.currentUser,
            }
          : state,
      );
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
            <Avatar size={48} icon={<UserOutlined />} />
            <div>
              <Typography.Title level={4} style={{ margin: 0 }}>
                {profile?.displayName ?? 'OpenCore User'}
              </Typography.Title>
              <Typography.Text type="secondary">
                {profile?.username ?? 'unknown'}
              </Typography.Text>
            </div>
          </div>
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
      </div>
    </PageContainer>
  );
}
