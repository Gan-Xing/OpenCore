export type OnlineUserSessionRecord = {
  id: string;
  username: string;
  tokenId: string;
  ip: string;
  userAgent: string;
  browser: string;
  os: string;
  lastSeenAt: string;
  expiresAt: string;
  revokedAt?: string;
  revokedBy?: string;
  revokedReason?: string;
};

export const seedOnlineUserSessions: readonly OnlineUserSessionRecord[] = [
  {
    id: 'session_admin',
    username: 'admin',
    tokenId: 'token_admin_1',
    ip: '127.0.0.1',
    userAgent: 'OpenCore Admin',
    browser: 'OpenCore Admin',
    os: 'Unknown',
    lastSeenAt: '2026-06-10T00:00:00.000Z',
    expiresAt: '2026-06-10T01:00:00.000Z',
  },
  {
    id: 'session_operator',
    username: 'operator',
    tokenId: 'token_operator_1',
    ip: '127.0.0.2',
    userAgent: 'OpenCore Smoke Operator',
    browser: 'OpenCore Smoke',
    os: 'Unknown',
    lastSeenAt: '2026-06-10T00:05:00.000Z',
    expiresAt: '2026-06-10T01:05:00.000Z',
  },
];
