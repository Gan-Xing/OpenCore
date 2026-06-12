export type OnlineUserSessionRecord = {
  id: string;
  username: string;
  tokenId: string;
  ip: string;
  userAgent: string;
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
    lastSeenAt: '2026-06-10T00:00:00.000Z',
    expiresAt: '2026-06-10T01:00:00.000Z',
  },
];
