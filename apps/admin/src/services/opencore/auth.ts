import {
  createRbacClient,
  type AuthenticatedUser,
  type LoginRequest,
  type LoginResponse,
  type LogoutResponse,
  type UpdateUserPasswordRequest,
  type UpdateUserProfileRequest,
  type UserPasswordMutationSummary,
  type UserProfileActivitySummary,
  type UserProfileKickOutOtherSessionsSummary,
  type UserProfileSummary,
} from '@opencore/sdk';
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
): Promise<LoginResponse> {
  const session = await authClient.login(requestBody);
  setAdminToken(session.accessToken);
  return session;
}

export async function queryCurrentOpenCoreUser(): Promise<LoginResponse> {
  return authClient.me(getRequiredAdminToken());
}

export async function logoutFromOpenCore(): Promise<LogoutResponse> {
  return authClient.logout(getRequiredAdminToken());
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
