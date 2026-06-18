import {
  DeleteOutlined,
  DisconnectOutlined,
  CheckOutlined,
  LinkOutlined,
  LockOutlined,
  LoginOutlined,
  ReloadOutlined,
  RotateLeftOutlined,
  RotateRightOutlined,
  SafetyCertificateOutlined,
  SaveOutlined,
  UndoOutlined,
  UploadOutlined,
  UserOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import type {
  OAuthProfileAccountSummary,
  OAuthProfileProviderSummary,
  UserProfileActivitySummary,
  UserProfileLoginActivitySummary,
  UserProfileSessionSummary,
  UserProfileSummary,
} from '@opencore/sdk';
import { history, useIntl, useModel } from '@umijs/max';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Descriptions,
  Empty,
  Form,
  Input,
  Modal,
  Progress,
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { TableColumnsType } from 'antd';
import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';
import type { ChangeEvent, CSSProperties } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  deleteOpenCoreUserAvatar,
  getOpenCoreUserProfile,
  getOpenCoreUserProfileActivity,
  kickOutOtherOpenCoreUserProfileSessions,
  updateOpenCoreUserAvatar,
  updateOpenCoreUserPassword,
  updateOpenCoreUserProfile,
} from '@/services/opencore/auth';
import {
  listOpenCoreProfileOAuthAccounts,
  listOpenCoreProfileOAuthProviders,
  startOpenCoreProfileOAuthFlow,
  unbindOpenCoreProfileOAuthAccount,
} from '@/services/opencore/platform';
import { removeAdminToken } from '@/services/opencore/token';

type ProfileFormValues = {
  displayName: string;
  email?: string;
  gender?: string;
  mobile?: string;
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
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
  alignItems: 'start',
};

const summaryHeaderStyle: CSSProperties = {
  display: 'flex',
  gap: 14,
  alignItems: 'center',
  marginBottom: 20,
};

const tabSectionStyle: CSSProperties = {
  maxWidth: 760,
};

const profileTabsCardStyle: CSSProperties = {
  minWidth: 0,
};

const profileTabsStyle: CSSProperties = {
  minWidth: 0,
};

const scrollableProfileTabStyle: CSSProperties = {
  maxHeight: 'min(640px, calc(100vh - 260px))',
  overscrollBehavior: 'contain',
  overflowX: 'hidden',
  overflowY: 'auto',
  paddingRight: 8,
  WebkitOverflowScrolling: 'touch',
};

const AVATAR_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif';
const AVATAR_MAX_BYTES = 1_048_576;
const AVATAR_SOURCE_MAX_BYTES = 5_242_880;
const AVATAR_CROP_SIZE = 512;
const AVATAR_MIME_TYPES = new Set(AVATAR_ACCEPT.split(','));

const avatarEditorBodyStyle: CSSProperties = {
  display: 'grid',
  gap: 16,
  gridTemplateColumns: 'minmax(0, 1fr) 180px',
};

const avatarCropperFrameStyle: CSSProperties = {
  background: '#f5f5f5',
  height: 360,
  overflow: 'hidden',
};

const avatarCropperImageStyle: CSSProperties = {
  display: 'block',
  maxWidth: '100%',
};

const avatarPreviewPanelStyle: CSSProperties = {
  alignItems: 'center',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};

const avatarToolbarStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  marginTop: 12,
};

function normalizeOptionalText(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function renderTags(values: readonly string[] | undefined, emptyText: string) {
  if (!values || values.length === 0) {
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

function getPasswordStrength(value: string | undefined) {
  const password = value ?? '';
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score >= 4)
    return { key: 'strong', percent: 100, status: 'success' as const };
  if (score >= 2)
    return { key: 'medium', percent: 60, status: 'normal' as const };
  return {
    key: 'weak',
    percent: password ? 30 : 0,
    status: 'exception' as const,
  };
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        reject(new Error('Unable to render avatar.'));
      },
      type,
      quality,
    );
  });
}

function getAvatarUploadFileName(originalName: string, mimeType: string) {
  const extension = mimeType === 'image/jpeg' ? 'jpg' : 'png';
  const baseName = originalName.replace(/\.[^.]*$/u, '') || 'avatar';

  return `${baseName}.${extension}`;
}

export default function PersonalProfilePage() {
  const intl = useIntl();
  const [form] = Form.useForm<ProfileFormValues>();
  const [passwordForm] = Form.useForm<PasswordFormValues>();
  const { setInitialState } = useModel('@@initialState');
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const watchedNewPassword = Form.useWatch('newPassword', passwordForm);
  const [profile, setProfile] = useState<UserProfileSummary>();
  const [activity, setActivity] = useState<UserProfileActivitySummary>();
  const [oauthAccounts, setOauthAccounts] = useState<
    readonly OAuthProfileAccountSummary[]
  >([]);
  const [oauthProviders, setOauthProviders] = useState<
    readonly OAuthProfileProviderSummary[]
  >([]);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string>();
  const [avatarEditorFileName, setAvatarEditorFileName] =
    useState('avatar.png');
  const [avatarEditorMimeType, setAvatarEditorMimeType] = useState('image/png');
  const [avatarEditorOpen, setAvatarEditorOpen] = useState(false);
  const [avatarEditorUrl, setAvatarEditorUrl] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [deletingAvatar, setDeletingAvatar] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [kickingOut, setKickingOut] = useState(false);
  const [bindingProviderCode, setBindingProviderCode] = useState<string>();
  const [unbindingTokenId, setUnbindingTokenId] = useState<string>();
  const [loadError, setLoadError] = useState<string>();
  const avatarCropperImageRef = useRef<HTMLImageElement>(null);
  const avatarCropperRef = useRef<Cropper | undefined>(undefined);
  const formatMessage: FormatMessage = useCallback(
    (id, defaultMessage, values) =>
      values
        ? intl.formatMessage({ id, defaultMessage }, values)
        : intl.formatMessage({ id, defaultMessage }),
    [intl],
  );
  const passwordStrength = getPasswordStrength(watchedNewPassword);

  useEffect(
    () => () => {
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    },
    [avatarPreviewUrl],
  );

  const destroyAvatarCropper = useCallback(() => {
    avatarCropperRef.current?.destroy();
    avatarCropperRef.current = undefined;
  }, []);

  const initializeAvatarCropper = useCallback(() => {
    const image = avatarCropperImageRef.current;

    if (!avatarEditorOpen || !image) {
      return;
    }

    destroyAvatarCropper();
    avatarCropperRef.current = new Cropper(image, {
      aspectRatio: 1,
      autoCropArea: 1,
      background: false,
      checkOrientation: true,
      dragMode: 'move',
      guides: true,
      preview: '.opencore-avatar-crop-preview',
      responsive: true,
      viewMode: 1,
    });
  }, [avatarEditorOpen, destroyAvatarCropper]);

  const closeAvatarEditor = useCallback(() => {
    destroyAvatarCropper();
    setAvatarEditorOpen(false);
    setAvatarEditorUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return undefined;
    });
    setAvatarPreviewUrl(undefined);
  }, [destroyAvatarCropper]);

  useEffect(
    () => () => {
      destroyAvatarCropper();
      if (avatarEditorUrl) URL.revokeObjectURL(avatarEditorUrl);
    },
    [avatarEditorUrl, destroyAvatarCropper],
  );

  const formatDateTime = useCallback(
    (value?: string) => {
      if (!value) return '-';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return value;
      return date.toLocaleString(intl.locale);
    },
    [intl.locale],
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
      const [nextProfile, nextActivity, nextAccounts, nextProviders] =
        await Promise.all([
          getOpenCoreUserProfile(),
          getOpenCoreUserProfileActivity(),
          listOpenCoreProfileOAuthAccounts(),
          listOpenCoreProfileOAuthProviders(),
        ]);
      setProfile(nextProfile);
      setActivity(nextActivity);
      setOauthAccounts(nextAccounts);
      setOauthProviders(nextProviders);
      form.setFieldsValue({
        displayName: nextProfile.displayName,
        email: nextProfile.email,
        gender: nextProfile.gender,
        mobile: nextProfile.mobile,
      });
      setLoadError(undefined);
    } catch (error: unknown) {
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
  }, [form, formatMessage]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthStatus = params.get('oauthStatus');

    if (!oauthStatus) {
      return;
    }

    if (oauthStatus === 'accepted') {
      message.success(
        formatMessage(
          'pages.personal.profile.messages.oauthBindingCompleted',
          'Account binding completed.',
        ),
      );
      void loadProfile();
    } else {
      message.error(
        formatMessage(
          'pages.personal.profile.messages.oauthBindingFailed',
          'Account binding failed.',
        ),
      );
    }

    history.replace({ pathname: '/personal/profile' });
  }, [formatMessage, loadProfile]);

  const handleSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const updated = await updateOpenCoreUserProfile({
        displayName: values.displayName.trim(),
        email: normalizeOptionalText(values.email),
        gender: normalizeOptionalText(values.gender),
        mobile: normalizeOptionalText(values.mobile),
      });
      setProfile(updated);
      form.setFieldsValue({
        displayName: updated.displayName,
        email: updated.email,
        gender: updated.gender,
        mobile: updated.mobile,
      });
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

    if (!file) return;

    if (!AVATAR_MIME_TYPES.has(file.type)) {
      message.error(
        formatMessage(
          'pages.personal.profile.avatar.invalidType',
          'Avatar must be PNG, JPEG, WebP or GIF.',
        ),
      );
      return;
    }

    if (file.size > AVATAR_SOURCE_MAX_BYTES) {
      message.error(
        formatMessage(
          'pages.personal.profile.avatar.sourceTooLarge',
          'Avatar source image must be 5 MB or smaller.',
        ),
      );
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setAvatarEditorFileName(file.name);
    setAvatarEditorMimeType(file.type);
    setAvatarEditorUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return objectUrl;
    });
    setAvatarPreviewUrl(objectUrl);
    setAvatarEditorOpen(true);
  };

  const handleAvatarCropperAction = (
    action: 'reset' | 'rotate-left' | 'rotate-right' | 'zoom-in' | 'zoom-out',
  ) => {
    const cropper = avatarCropperRef.current;

    if (!cropper) {
      return;
    }

    if (action === 'reset') {
      cropper.reset();
      return;
    }

    if (action === 'rotate-left') {
      cropper.rotate(-90);
      return;
    }

    if (action === 'rotate-right') {
      cropper.rotate(90);
      return;
    }

    cropper.zoom(action === 'zoom-in' ? 0.1 : -0.1);
  };

  const renderCroppedAvatar = async () => {
    const cropper = avatarCropperRef.current;
    const canvas = cropper?.getCroppedCanvas({
      fillColor: '#fff',
      height: AVATAR_CROP_SIZE,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
      width: AVATAR_CROP_SIZE,
    });

    if (!canvas) {
      throw new Error(
        formatMessage(
          'pages.personal.profile.avatar.cropFailure',
          'Unable to crop avatar image.',
        ),
      );
    }

    const primaryType =
      avatarEditorMimeType === 'image/jpeg' ? 'image/jpeg' : 'image/png';
    let blob = await canvasToBlob(
      canvas,
      primaryType,
      primaryType === 'image/jpeg' ? 0.92 : undefined,
    );
    let mimeType = primaryType;

    if (blob.size > AVATAR_MAX_BYTES && primaryType !== 'image/jpeg') {
      blob = await canvasToBlob(canvas, 'image/jpeg', 0.9);
      mimeType = 'image/jpeg';
    }

    if (blob.size > AVATAR_MAX_BYTES) {
      throw new Error(
        formatMessage(
          'pages.personal.profile.avatar.tooLarge',
          'Avatar must be 1 MB or smaller.',
        ),
      );
    }

    return {
      blob,
      fileName: getAvatarUploadFileName(avatarEditorFileName, mimeType),
    };
  };

  const handleAvatarEditorConfirm = async () => {
    setUploadingAvatar(true);
    try {
      const { blob, fileName } = await renderCroppedAvatar();
      const updated = await updateOpenCoreUserAvatar(blob, fileName);
      setProfile(updated);
      form.setFieldsValue({
        displayName: updated.displayName,
        email: updated.email,
        gender: updated.gender,
        mobile: updated.mobile,
      });
      closeAvatarEditor();
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
      setAvatarPreviewUrl(undefined);
      form.setFieldsValue({
        displayName: updated.displayName,
        email: updated.email,
        gender: updated.gender,
        mobile: updated.mobile,
      });
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

  const confirmDeleteAvatar = () => {
    Modal.confirm({
      title: formatMessage(
        'pages.personal.profile.confirm.removeAvatar',
        'Remove avatar?',
      ),
      content: formatMessage(
        'pages.personal.profile.confirm.removeAvatarContent',
        'The current avatar will be removed from your account.',
      ),
      okText: formatMessage(
        'pages.personal.profile.actions.removeAvatar',
        'Remove avatar',
      ),
      okButtonProps: { danger: true },
      cancelText: formatMessage(
        'pages.personal.profile.actions.cancel',
        'Cancel',
      ),
      onOk: () => handleDeleteAvatar(),
    });
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

  const handleKickOutOtherSessions = async () => {
    setKickingOut(true);
    try {
      const result = await kickOutOtherOpenCoreUserProfileSessions();
      message.success(
        formatMessage(
          'pages.personal.profile.messages.sessionsKicked',
          '{count} other session(s) signed out.',
          { count: result.kicked },
        ),
      );
      await loadProfile();
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.personal.profile.messages.sessionsKickFailure',
              'Unable to sign out other sessions.',
            ),
      );
    } finally {
      setKickingOut(false);
    }
  };

  const formatOAuthBindingIssue = (provider: OAuthProfileProviderSummary) => {
    const issue = provider.bindingIssue ?? 'missing_config';
    return formatMessage(
      `pages.personal.profile.oauth.bindingIssue.${issue}`,
      '{name} is not ready for account binding.',
      { name: provider.name },
    );
  };

  const handleStartOAuthBinding = async (
    provider: OAuthProfileProviderSummary,
  ) => {
    if (provider.bindingStatus !== 'ready') {
      Modal.warning({
        title: formatMessage(
          'pages.personal.profile.oauth.notReadyTitle',
          'Account binding is not ready.',
        ),
        content: formatOAuthBindingIssue(provider),
        okText: formatMessage('pages.personal.profile.actions.ok', 'OK'),
      });
      return;
    }

    setBindingProviderCode(provider.code);
    try {
      const flow = await startOpenCoreProfileOAuthFlow({
        providerCode: provider.code,
      });
      window.open(flow.authorizationUrl, '_blank', 'noopener,noreferrer');
      message.success(
        formatMessage(
          'pages.personal.profile.messages.oauthFlowStarted',
          'Authorization page opened.',
        ),
      );
      await loadProfile();
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.personal.profile.messages.oauthFlowFailure',
              'Unable to start account binding.',
            ),
      );
    } finally {
      setBindingProviderCode(undefined);
    }
  };

  const confirmUnbindOAuthAccount = (account: OAuthProfileAccountSummary) => {
    Modal.confirm({
      title: formatMessage(
        'pages.personal.profile.confirm.unbindAccount',
        'Unbind account?',
      ),
      content: formatMessage(
        'pages.personal.profile.confirm.unbindAccountContent',
        'The selected account binding will be revoked.',
      ),
      okText: formatMessage('pages.personal.profile.actions.unbind', 'Unbind'),
      okButtonProps: { danger: true },
      cancelText: formatMessage(
        'pages.personal.profile.actions.cancel',
        'Cancel',
      ),
      onOk: async () => {
        setUnbindingTokenId(account.tokenId);
        try {
          await unbindOpenCoreProfileOAuthAccount(account.tokenId, {
            reason: 'Self-service account binding removed from profile center.',
          });
          message.success(
            formatMessage(
              'pages.personal.profile.messages.oauthUnbound',
              'Account binding removed.',
            ),
          );
          await loadProfile();
        } finally {
          setUnbindingTokenId(undefined);
        }
      },
    });
  };

  const emptyText = formatMessage('pages.personal.profile.status.none', 'None');
  const avatarSrc = avatarPreviewUrl ?? profile?.avatarUrl;

  const formatGender = (value?: string) => {
    if (value === 'female') {
      return formatMessage('pages.personal.profile.gender.female', 'Female');
    }
    if (value === 'male') {
      return formatMessage('pages.personal.profile.gender.male', 'Male');
    }
    if (value === 'unknown') {
      return formatMessage('pages.personal.profile.gender.unknown', 'Unknown');
    }
    return '-';
  };

  const formatOAuthStatus = (value: OAuthProfileAccountSummary['status']) =>
    ({
      active: formatMessage(
        'pages.personal.profile.oauth.status.active',
        'Active',
      ),
      expired: formatMessage(
        'pages.personal.profile.oauth.status.expired',
        'Expired',
      ),
      revoked: formatMessage(
        'pages.personal.profile.oauth.status.revoked',
        'Revoked',
      ),
    })[value] ?? value;

  const formatLoginType = (value: UserProfileLoginActivitySummary['logType']) =>
    ({
      'login.mobile': formatMessage(
        'pages.personal.profile.loginType.mobile',
        'Mobile login',
      ),
      'login.sms': formatMessage(
        'pages.personal.profile.loginType.sms',
        'SMS login',
      ),
      'login.social': formatMessage(
        'pages.personal.profile.loginType.social',
        'Social login',
      ),
      'login.username': formatMessage(
        'pages.personal.profile.loginType.username',
        'Username login',
      ),
      'logout.force': formatMessage(
        'pages.personal.profile.loginType.forceLogout',
        'Forced logout',
      ),
      'logout.self': formatMessage(
        'pages.personal.profile.loginType.selfLogout',
        'Self logout',
      ),
    })[value] ?? value;

  const formatLoginResult = (
    value: UserProfileLoginActivitySummary['result'],
  ) =>
    ({
      account_locked: formatMessage(
        'pages.personal.profile.loginResult.accountLocked',
        'Account locked',
      ),
      bad_credentials: formatMessage(
        'pages.personal.profile.loginResult.badCredentials',
        'Bad credentials',
      ),
      captcha_code_error: formatMessage(
        'pages.personal.profile.loginResult.captchaError',
        'Captcha error',
      ),
      captcha_not_found: formatMessage(
        'pages.personal.profile.loginResult.captchaMissing',
        'Captcha missing',
      ),
      success: formatMessage(
        'pages.personal.profile.loginResult.success',
        'Success',
      ),
      user_disabled: formatMessage(
        'pages.personal.profile.loginResult.userDisabled',
        'User disabled',
      ),
    })[value] ?? value;

  const sessionColumns: TableColumnsType<UserProfileSessionSummary> = [
    {
      title: formatMessage('pages.personal.profile.fields.session', 'Session'),
      dataIndex: 'id',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{record.browser}</Typography.Text>
          <Typography.Text type="secondary">{record.os}</Typography.Text>
          {record.current ? (
            <Tag color="green">
              {formatMessage(
                'pages.personal.profile.status.currentSession',
                'Current session',
              )}
            </Tag>
          ) : null}
        </Space>
      ),
    },
    {
      title: formatMessage('pages.personal.profile.fields.ip', 'IP'),
      dataIndex: 'ip',
    },
    {
      title: formatMessage(
        'pages.personal.profile.fields.lastSeenAt',
        'Last seen',
      ),
      dataIndex: 'lastSeenAt',
      render: (value: string) => formatDateTime(value),
    },
    {
      title: formatMessage(
        'pages.personal.profile.fields.expiresAt',
        'Expires at',
      ),
      dataIndex: 'expiresAt',
      render: (value: string) => formatDateTime(value),
    },
  ];

  const loginLogColumns: TableColumnsType<UserProfileLoginActivitySummary> = [
    {
      title: formatMessage('pages.personal.profile.fields.time', 'Time'),
      dataIndex: 'createdAt',
      render: (value: string) => formatDateTime(value),
    },
    {
      title: formatMessage('pages.personal.profile.fields.loginType', 'Type'),
      dataIndex: 'logType',
      render: (value: UserProfileLoginActivitySummary['logType']) =>
        formatLoginType(value),
    },
    {
      title: formatMessage('pages.personal.profile.fields.result', 'Result'),
      dataIndex: 'result',
      render: (value: UserProfileLoginActivitySummary['result'], record) => (
        <Tag color={record.success ? 'green' : 'red'}>
          {formatLoginResult(value)}
        </Tag>
      ),
    },
    {
      title: formatMessage('pages.personal.profile.fields.ip', 'IP'),
      dataIndex: 'ip',
    },
    {
      title: formatMessage('pages.personal.profile.fields.device', 'Device'),
      dataIndex: 'browser',
      render: (_, record) => `${record.browser} / ${record.os}`,
    },
  ];

  const oauthColumns: TableColumnsType<OAuthProfileAccountSummary> = [
    {
      title: formatMessage(
        'pages.personal.profile.oauth.fields.channel',
        'Binding channel',
      ),
      dataIndex: 'providerName',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{record.providerName}</Typography.Text>
          <Typography.Text type="secondary">
            {record.providerCode}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: formatMessage(
        'pages.personal.profile.oauth.fields.account',
        'External account',
      ),
      dataIndex: 'providerAccountId',
    },
    {
      title: formatMessage('pages.personal.profile.fields.status', 'Status'),
      dataIndex: 'status',
      render: (value: OAuthProfileAccountSummary['status']) => (
        <Tag
          color={
            value === 'active'
              ? 'green'
              : value === 'revoked'
                ? 'red'
                : 'orange'
          }
        >
          {formatOAuthStatus(value)}
        </Tag>
      ),
    },
    {
      title: formatMessage(
        'pages.personal.profile.fields.createdAt',
        'Created at',
      ),
      dataIndex: 'createdAt',
      render: (value: string) => formatDateTime(value),
    },
    {
      title: formatMessage('pages.personal.profile.actions.column', 'Action'),
      key: 'action',
      render: (_, record) => (
        <Button
          danger
          disabled={record.status !== 'active'}
          icon={<DisconnectOutlined />}
          loading={unbindingTokenId === record.tokenId}
          size="small"
          onClick={() => confirmUnbindOAuthAccount(record)}
        >
          {formatMessage('pages.personal.profile.actions.unbind', 'Unbind')}
        </Button>
      ),
    },
  ];

  return (
    <PageContainer
      title={formatMessage('pages.personal.profile.title', 'Profile center')}
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
        <Card loading={loading && !profile}>
          <div style={summaryHeaderStyle}>
            <Avatar
              shape="square"
              size={72}
              src={avatarSrc}
              icon={avatarSrc ? undefined : <UserOutlined />}
            />
            <div>
              <Typography.Title level={4} style={{ margin: 0 }}>
                {profile?.displayName ?? '-'}
              </Typography.Title>
              <Typography.Text type="secondary">
                {profile?.username ?? '-'}
              </Typography.Text>
              <div style={{ marginTop: 8 }}>
                <Tag color={profile?.enabled ? 'green' : 'red'}>
                  {profile?.enabled
                    ? formatMessage(
                        'pages.personal.profile.status.enabled',
                        'Enabled',
                      )
                    : formatMessage(
                        'pages.personal.profile.status.disabled',
                        'Disabled',
                      )}
                </Tag>
              </div>
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
              disabled={!profile}
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
              onClick={confirmDeleteAvatar}
            >
              {formatMessage(
                'pages.personal.profile.actions.removeAvatar',
                'Remove avatar',
              )}
            </Button>
          </Space>

          <Modal
            destroyOnClose
            maskClosable={!uploadingAvatar}
            open={avatarEditorOpen}
            title={formatMessage(
              'pages.personal.profile.avatar.editorTitle',
              'Edit avatar',
            )}
            width={780}
            footer={[
              <Button
                key="cancel"
                disabled={uploadingAvatar}
                onClick={closeAvatarEditor}
              >
                {formatMessage(
                  'pages.personal.profile.actions.cancel',
                  'Cancel',
                )}
              </Button>,
              <Button
                key="submit"
                type="primary"
                icon={<CheckOutlined />}
                loading={uploadingAvatar}
                onClick={() => void handleAvatarEditorConfirm()}
              >
                {formatMessage(
                  'pages.personal.profile.avatar.confirmUpload',
                  'Crop and upload',
                )}
              </Button>,
            ]}
            onCancel={() => {
              if (!uploadingAvatar) closeAvatarEditor();
            }}
          >
            <div style={avatarEditorBodyStyle}>
              <div>
                <div style={avatarCropperFrameStyle}>
                  {avatarEditorUrl ? (
                    <img
                      ref={avatarCropperImageRef}
                      alt={formatMessage(
                        'pages.personal.profile.avatar.editorTitle',
                        'Edit avatar',
                      )}
                      src={avatarEditorUrl}
                      style={avatarCropperImageStyle}
                      onLoad={initializeAvatarCropper}
                    />
                  ) : null}
                </div>
                <div style={avatarToolbarStyle}>
                  <Tooltip
                    title={formatMessage(
                      'pages.personal.profile.avatar.reset',
                      'Reset crop',
                    )}
                  >
                    <Button
                      icon={<UndoOutlined />}
                      onClick={() => handleAvatarCropperAction('reset')}
                    />
                  </Tooltip>
                  <Tooltip
                    title={formatMessage(
                      'pages.personal.profile.avatar.rotateLeft',
                      'Rotate left',
                    )}
                  >
                    <Button
                      icon={<RotateLeftOutlined />}
                      onClick={() => handleAvatarCropperAction('rotate-left')}
                    />
                  </Tooltip>
                  <Tooltip
                    title={formatMessage(
                      'pages.personal.profile.avatar.rotateRight',
                      'Rotate right',
                    )}
                  >
                    <Button
                      icon={<RotateRightOutlined />}
                      onClick={() => handleAvatarCropperAction('rotate-right')}
                    />
                  </Tooltip>
                  <Tooltip
                    title={formatMessage(
                      'pages.personal.profile.avatar.zoomIn',
                      'Zoom in',
                    )}
                  >
                    <Button
                      icon={<ZoomInOutlined />}
                      onClick={() => handleAvatarCropperAction('zoom-in')}
                    />
                  </Tooltip>
                  <Tooltip
                    title={formatMessage(
                      'pages.personal.profile.avatar.zoomOut',
                      'Zoom out',
                    )}
                  >
                    <Button
                      icon={<ZoomOutOutlined />}
                      onClick={() => handleAvatarCropperAction('zoom-out')}
                    />
                  </Tooltip>
                </div>
              </div>
              <div style={avatarPreviewPanelStyle}>
                <Typography.Text type="secondary">
                  {formatMessage(
                    'pages.personal.profile.avatar.preview',
                    'Preview',
                  )}
                </Typography.Text>
                <div
                  className="opencore-avatar-crop-preview"
                  style={{
                    border: '1px solid #d9d9d9',
                    borderRadius: '50%',
                    height: 128,
                    overflow: 'hidden',
                    width: 128,
                  }}
                />
                <Typography.Text type="secondary">
                  {AVATAR_CROP_SIZE} x {AVATAR_CROP_SIZE}
                </Typography.Text>
              </div>
            </div>
          </Modal>

          <Descriptions column={1} size="small" bordered>
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
              {profile?.deptName ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item
              label={formatMessage(
                'pages.personal.profile.fields.roles',
                'Roles',
              )}
            >
              {renderTags(profile?.roleNames, emptyText)}
            </Descriptions.Item>
            <Descriptions.Item
              label={formatMessage(
                'pages.personal.profile.fields.posts',
                'Posts',
              )}
            >
              {renderTags(profile?.postNames, emptyText)}
            </Descriptions.Item>
            <Descriptions.Item
              label={formatMessage(
                'pages.personal.profile.fields.mobile',
                'Mobile',
              )}
            >
              {profile?.mobile ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item
              label={formatMessage(
                'pages.personal.profile.fields.email',
                'Email',
              )}
            >
              {profile?.email ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item
              label={formatMessage(
                'pages.personal.profile.fields.gender',
                'Gender',
              )}
            >
              {formatGender(profile?.gender)}
            </Descriptions.Item>
            <Descriptions.Item
              label={formatMessage(
                'pages.personal.profile.fields.createdAt',
                'Created at',
              )}
            >
              {formatDateTime(profile?.createdAt)}
            </Descriptions.Item>
            <Descriptions.Item
              label={formatMessage(
                'pages.personal.profile.fields.updatedAt',
                'Updated at',
              )}
            >
              {formatDateTime(profile?.updatedAt)}
            </Descriptions.Item>
            <Descriptions.Item
              label={formatMessage(
                'pages.personal.profile.fields.avatarMeta',
                'Avatar metadata',
              )}
            >
              {profile?.avatarMimeType
                ? `${profile.avatarMimeType} / ${profile.avatarSizeBytes ?? 0} B`
                : '-'}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card style={profileTabsCardStyle}>
          {loadError ? (
            <Alert
              type="error"
              showIcon
              message={formatMessage(
                'pages.personal.profile.load.failure',
                'Unable to load profile.',
              )}
              description={loadError}
              style={{ marginBottom: 16 }}
            />
          ) : null}

          <Spin spinning={loading}>
            <Tabs
              style={profileTabsStyle}
              items={[
                {
                  key: 'basic',
                  label: formatMessage(
                    'pages.personal.profile.tabs.basic',
                    'Basic profile',
                  ),
                  children: (
                    <div style={tabSectionStyle}>
                      <Form<ProfileFormValues>
                        form={form}
                        layout="vertical"
                        disabled={loading || !profile}
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
                        <Form.Item
                          label={formatMessage(
                            'pages.personal.profile.fields.mobile',
                            'Mobile',
                          )}
                          name="mobile"
                          rules={[
                            {
                              max: 32,
                              message: formatMessage(
                                'pages.personal.profile.validation.mobileMax',
                                'Mobile must be 32 characters or fewer.',
                              ),
                            },
                          ]}
                        >
                          <Input maxLength={32} autoComplete="tel" />
                        </Form.Item>
                        <Form.Item
                          label={formatMessage(
                            'pages.personal.profile.fields.email',
                            'Email',
                          )}
                          name="email"
                          rules={[
                            {
                              type: 'email',
                              message: formatMessage(
                                'pages.personal.profile.validation.emailInvalid',
                                'Email format is invalid.',
                              ),
                            },
                            {
                              max: 120,
                              message: formatMessage(
                                'pages.personal.profile.validation.emailMax',
                                'Email must be 120 characters or fewer.',
                              ),
                            },
                          ]}
                        >
                          <Input maxLength={120} autoComplete="email" />
                        </Form.Item>
                        <Form.Item
                          label={formatMessage(
                            'pages.personal.profile.fields.gender',
                            'Gender',
                          )}
                          name="gender"
                        >
                          <Select
                            allowClear
                            options={[
                              {
                                label: formatMessage(
                                  'pages.personal.profile.gender.female',
                                  'Female',
                                ),
                                value: 'female',
                              },
                              {
                                label: formatMessage(
                                  'pages.personal.profile.gender.male',
                                  'Male',
                                ),
                                value: 'male',
                              },
                              {
                                label: formatMessage(
                                  'pages.personal.profile.gender.unknown',
                                  'Unknown',
                                ),
                                value: 'unknown',
                              },
                            ]}
                          />
                        </Form.Item>
                        <Button
                          type="primary"
                          htmlType="submit"
                          icon={<SaveOutlined />}
                          loading={saving}
                        >
                          {formatMessage(
                            'pages.personal.profile.actions.save',
                            'Save',
                          )}
                        </Button>
                      </Form>
                    </div>
                  ),
                },
                {
                  key: 'security',
                  label: formatMessage(
                    'pages.personal.profile.tabs.security',
                    'Security settings',
                  ),
                  children: (
                    <div style={tabSectionStyle}>
                      <Alert
                        type="info"
                        showIcon
                        icon={<SafetyCertificateOutlined />}
                        message={formatMessage(
                          'pages.personal.profile.password.policy',
                          'After password change, active sessions are revoked and you must sign in again.',
                        )}
                        style={{ marginBottom: 16 }}
                      />
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
                                if (
                                  !value ||
                                  value !== getFieldValue('oldPassword')
                                ) {
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
                        <Space
                          direction="vertical"
                          style={{ width: '100%', marginBottom: 16 }}
                        >
                          <Typography.Text type="secondary">
                            {formatMessage(
                              `pages.personal.profile.password.strength.${passwordStrength.key}`,
                              passwordStrength.key,
                            )}
                          </Typography.Text>
                          <Progress
                            percent={passwordStrength.percent}
                            showInfo={false}
                            status={passwordStrength.status}
                          />
                        </Space>
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
                                if (
                                  !value ||
                                  value === getFieldValue('newPassword')
                                ) {
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
                        <Space wrap>
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
                          <Button
                            icon={<LoginOutlined />}
                            loading={kickingOut}
                            onClick={() => void handleKickOutOtherSessions()}
                          >
                            {formatMessage(
                              'pages.personal.profile.actions.kickOutOthers',
                              'Sign out other devices',
                            )}
                          </Button>
                        </Space>
                      </Form>
                    </div>
                  ),
                },
                {
                  key: 'binding',
                  label: formatMessage(
                    'pages.personal.profile.tabs.bindings',
                    'Account binding',
                  ),
                  children: (
                    <div
                      data-opencore-profile-scroll-pane="account-binding"
                      style={scrollableProfileTabStyle}
                    >
                      <Space
                        direction="vertical"
                        size={16}
                        style={{ width: '100%' }}
                      >
                        {oauthProviders.some(
                          (provider) => provider.bindingStatus !== 'ready',
                        ) ? (
                          <Alert
                            type="warning"
                            showIcon
                            message={formatMessage(
                              'pages.personal.profile.oauth.notReadyHint',
                              'Some account binding channels still need configuration.',
                            )}
                          />
                        ) : null}
                        <Space wrap>
                          {oauthProviders.map((provider) => {
                            const isReady = provider.bindingStatus === 'ready';
                            const statusLabel = isReady
                              ? formatMessage(
                                  'pages.personal.profile.oauth.bindingStatus.ready',
                                  'Ready',
                                )
                              : formatMessage(
                                  'pages.personal.profile.oauth.bindingStatus.requiresConfiguration',
                                  'Needs configuration',
                                );

                            return (
                              <Space key={provider.code} size={8} wrap>
                                <Tooltip
                                  title={
                                    isReady
                                      ? undefined
                                      : formatOAuthBindingIssue(provider)
                                  }
                                >
                                  <Button
                                    icon={<LinkOutlined />}
                                    loading={
                                      bindingProviderCode === provider.code
                                    }
                                    onClick={() =>
                                      void handleStartOAuthBinding(provider)
                                    }
                                  >
                                    {formatMessage(
                                      'pages.personal.profile.actions.bindChannel',
                                      'Bind {name}',
                                      { name: provider.name },
                                    )}
                                  </Button>
                                </Tooltip>
                                <Tag color={isReady ? 'green' : 'orange'}>
                                  {statusLabel}
                                </Tag>
                              </Space>
                            );
                          })}
                        </Space>
                        {oauthProviders.length === 0 ? (
                          <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={formatMessage(
                              'pages.personal.profile.oauth.emptyProviders',
                              'No enabled account binding channel.',
                            )}
                          />
                        ) : null}
                        <Table<OAuthProfileAccountSummary>
                          columns={oauthColumns}
                          dataSource={[...oauthAccounts]}
                          locale={{
                            emptyText: formatMessage(
                              'pages.personal.profile.oauth.emptyAccounts',
                              'No account binding yet.',
                            ),
                          }}
                          pagination={false}
                          rowKey="tokenId"
                          scroll={{ x: 'max-content' }}
                          size="small"
                        />
                      </Space>
                    </div>
                  ),
                },
                {
                  key: 'activity',
                  label: formatMessage(
                    'pages.personal.profile.tabs.activity',
                    'Login activity',
                  ),
                  children: (
                    <div
                      data-opencore-profile-scroll-pane="login-activity"
                      style={scrollableProfileTabStyle}
                    >
                      <Space
                        direction="vertical"
                        size={20}
                        style={{ width: '100%' }}
                      >
                        <div>
                          <Typography.Title level={5}>
                            {formatMessage(
                              'pages.personal.profile.activity.sessions',
                              'Current sessions',
                            )}
                          </Typography.Title>
                          <Table<UserProfileSessionSummary>
                            columns={sessionColumns}
                            dataSource={[...(activity?.sessions ?? [])]}
                            locale={{
                              emptyText: formatMessage(
                                'pages.personal.profile.activity.emptySessions',
                                'No active session.',
                              ),
                            }}
                            pagination={false}
                            rowKey="id"
                            scroll={{ x: 'max-content' }}
                            size="small"
                          />
                        </div>
                        <div>
                          <Typography.Title level={5}>
                            {formatMessage(
                              'pages.personal.profile.activity.loginLogs',
                              'Recent login records',
                            )}
                          </Typography.Title>
                          <Table<UserProfileLoginActivitySummary>
                            columns={loginLogColumns}
                            dataSource={[...(activity?.loginLogs ?? [])]}
                            locale={{
                              emptyText: formatMessage(
                                'pages.personal.profile.activity.emptyLoginLogs',
                                'No login record.',
                              ),
                            }}
                            pagination={false}
                            rowKey="id"
                            scroll={{ x: 'max-content' }}
                            size="small"
                          />
                        </div>
                      </Space>
                    </div>
                  ),
                },
              ]}
            />
          </Spin>
        </Card>
      </div>
    </PageContainer>
  );
}
