import type { SdkRequest } from '@opencore/sdk';
import { request } from '@umijs/max';
import { getAdminToken } from './token';

export class MissingAdminTokenError extends Error {
  constructor() {
    super('Missing OpenCore admin bearer token');
    this.name = 'MissingAdminTokenError';
  }
}

type SdkRequestOptions = {
  body?: unknown;
  method?: 'DELETE' | 'GET' | 'PATCH' | 'POST';
  token?: string;
};

export const opencoreSdkRequest: SdkRequest = async <T>(
  path: `/${string}`,
  options: SdkRequestOptions = {},
): Promise<T> => {
  const token = options.token ?? getAdminToken();

  return request<T>(`/api${path}`, {
    method: options.method ?? 'GET',
    data: options.body,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
};

export function getRequiredAdminToken(): string {
  const token = getAdminToken();

  if (!token) {
    throw new MissingAdminTokenError();
  }

  return token;
}
