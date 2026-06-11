export const ADMIN_TOKEN_STORAGE_KEY = 'opencore.admin.token';

let memoryToken: string | undefined;

function getStorage(): Storage | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return window.localStorage;
}

export function getAdminToken(): string | undefined {
  return getStorage()?.getItem(ADMIN_TOKEN_STORAGE_KEY) ?? memoryToken;
}

export function setAdminToken(token: string): void {
  memoryToken = token;
  getStorage()?.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
}

export function removeAdminToken(): void {
  memoryToken = undefined;
  getStorage()?.removeItem(ADMIN_TOKEN_STORAGE_KEY);
}
