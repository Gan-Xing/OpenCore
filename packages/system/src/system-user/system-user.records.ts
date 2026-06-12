import { hashSystemUserPassword } from './system-user.password';

export type SystemUserRecord = {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  roleCodes: readonly string[];
  deptId?: string;
  enabled: boolean;
};

export const seedSystemUsers: readonly SystemUserRecord[] = [
  {
    id: 'user_admin',
    username: 'admin',
    displayName: 'OpenCore Admin',
    passwordHash: hashSystemUserPassword('admin123'),
    roleCodes: ['admin'],
    deptId: 'dept_headquarters',
    enabled: true,
  },
];
