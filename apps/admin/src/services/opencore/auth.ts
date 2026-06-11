import {
  createRbacClient,
  type AuthenticatedUser,
  type LoginRequest,
  type LoginResponse,
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
