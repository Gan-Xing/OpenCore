import type { AuthenticatedUser } from '../security-auth';

export type SecurityRequestWithAuth = {
  headers: {
    authorization?: string;
  };
  user?: AuthenticatedUser;
};
