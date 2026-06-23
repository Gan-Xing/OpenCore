import {
  createRbacClient,
  type AuthenticatedUser,
  type BindSocialAuthLoginRequest,
  type CompleteSocialAuthRequest,
  type LoginRequest,
  type LoginResult,
  type LoginResponse,
  type LogoutResponse,
  type SocialAuthFlowSummary,
  type SocialAuthProviderSummary,
  type SocialAuthResultSummary,
  type StartSocialAuthFlowRequest,
  type SwitchTenantRequest,
  type UpdateUserPasswordRequest,
  type UpdateUserProfileRequest,
  type UserPasswordMutationSummary,
  type UserProfileActivitySummary,
  type UserProfileKickOutOtherSessionsSummary,
  type UserProfileSummary,
} from '@opencore/sdk';
import { request } from '@umijs/max';
import {
  getRequiredAdminToken,
  MissingAdminTokenError,
  opencoreSdkRequest,
} from './client';
import { setAdminToken } from './token';

export { MissingAdminTokenError };

export type AdminCurrentUser = AuthenticatedUser & {
  avatar?: string;
  name: string;
  userid: string;
};

const authClient = createRbacClient(opencoreSdkRequest);

export function toAdminCurrentUser(user: AuthenticatedUser): AdminCurrentUser {
  return {
    ...user,
    avatar: user.avatarUrl,
    name: user.displayName,
    userid: user.id,
  };
}

export async function loginToOpenCore(
  requestBody: LoginRequest,
): Promise<LoginResult> {
  const session = await request<LoginResult>('/api/auth/login', {
    data: requestBody,
    method: 'POST',
    skipErrorHandler: true,
  });
  if (session.status === 'authenticated') {
    setAdminToken(session.accessToken);
  }
  return session;
}

export async function queryCurrentOpenCoreUser(): Promise<LoginResponse> {
  return authClient.me(getRequiredAdminToken());
}

export async function logoutFromOpenCore(): Promise<LogoutResponse> {
  return authClient.logout(getRequiredAdminToken());
}

export async function switchOpenCoreTenant(
  body: SwitchTenantRequest,
): Promise<AdminCurrentUser> {
  const session = await authClient.switchTenant(getRequiredAdminToken(), body);
  setAdminToken(session.accessToken);
  return toAdminCurrentUser(session.user);
}

export async function listOpenCoreSocialAuthProviders(): Promise<
  readonly SocialAuthProviderSummary[]
> {
  return authClient.listSocialAuthProviders();
}

export async function startOpenCoreSocialAuthFlow(
  body: StartSocialAuthFlowRequest,
): Promise<SocialAuthFlowSummary> {
  return authClient.startSocialAuthFlow(body);
}

export async function completeOpenCoreSocialAuthLogin(
  body: CompleteSocialAuthRequest,
): Promise<SocialAuthResultSummary> {
  const result = await authClient.completeSocialAuthLogin(body);
  if (result.session) {
    setAdminToken(result.session.accessToken);
  }
  return result;
}

export async function bindOpenCoreSocialAuthLogin(
  body: BindSocialAuthLoginRequest,
): Promise<SocialAuthResultSummary> {
  const result = await authClient.bindSocialAuthLogin(body);
  if (result.session) {
    setAdminToken(result.session.accessToken);
  }
  return result;
}

export async function getOpenCoreUserProfile(): Promise<UserProfileSummary> {
  return authClient.getUserProfile(getRequiredAdminToken());
}

export async function getOpenCoreUserProfileActivity(): Promise<UserProfileActivitySummary> {
  return authClient.getUserProfileActivity(getRequiredAdminToken());
}

export async function updateOpenCoreUserProfile(
  body: UpdateUserProfileRequest,
): Promise<UserProfileSummary> {
  return authClient.updateUserProfile(getRequiredAdminToken(), body);
}

export async function updateOpenCoreUserAvatar(
  file: Blob,
  filename: string,
): Promise<UserProfileSummary> {
  const body = new FormData();
  body.append('file', file, filename);
  return authClient.updateUserAvatar(getRequiredAdminToken(), body);
}

export async function deleteOpenCoreUserAvatar(): Promise<UserProfileSummary> {
  return authClient.deleteUserAvatar(getRequiredAdminToken());
}

export async function updateOpenCoreUserPassword(
  body: UpdateUserPasswordRequest,
): Promise<UserPasswordMutationSummary> {
  return authClient.updateUserPassword(getRequiredAdminToken(), body);
}

export async function kickOutOtherOpenCoreUserProfileSessions(): Promise<UserProfileKickOutOtherSessionsSummary> {
  return authClient.kickOutOtherUserProfileSessions(getRequiredAdminToken());
}
