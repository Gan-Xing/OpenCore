import { hashSystemUserPassword } from './system-user.password';

export type SystemUserRecord = {
  id: string;
  username: string;
  displayName: string;
  mobile?: string;
  email?: string;
  gender?: string;
  passwordHash: string;
  roleCodes: readonly string[];
  deptId?: string;
  postCodes: readonly string[];
  enabled: boolean;
  avatarUrl?: string;
  avatarStorageKey?: string;
  avatarMimeType?: string;
  avatarSizeBytes?: number;
  avatarUpdatedAt?: string;
  system: boolean;
  createdAt: string;
  updatedAt: string;
};

export const seedSystemUsers: readonly SystemUserRecord[] = [
  {
    id: 'user_admin',
    username: 'admin',
    displayName: 'OpenCore Admin',
    email: 'admin@opencore.local',
    passwordHash: hashSystemUserPassword('admin123'),
    roleCodes: ['admin'],
    deptId: 'dept_headquarters',
    postCodes: ['admin'],
    enabled: true,
    system: true,
    createdAt: '2026-06-10T00:00:00.000Z',
    updatedAt: '2026-06-10T00:00:00.000Z',
  },
];
