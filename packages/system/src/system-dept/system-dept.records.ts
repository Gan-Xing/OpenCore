export type SystemDeptRecord = {
  id: string;
  code: string;
  name: string;
  parentId?: string;
  order: number;
  leader?: string;
  phone?: string;
  email?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SystemDeptTreeRecord = SystemDeptRecord & {
  children: SystemDeptTreeRecord[];
};

export const seedSystemDepts: readonly SystemDeptRecord[] = [
  {
    id: 'dept_headquarters',
    code: 'hq',
    name: 'Headquarters',
    order: 10,
    leader: 'OpenCore Admin',
    enabled: true,
    createdAt: '2026-06-10T00:00:00.000Z',
    updatedAt: '2026-06-10T00:00:00.000Z',
  },
  {
    id: 'dept_engineering',
    code: 'engineering',
    name: 'Engineering',
    parentId: 'dept_headquarters',
    order: 20,
    leader: 'Platform Lead',
    enabled: true,
    createdAt: '2026-06-10T00:05:00.000Z',
    updatedAt: '2026-06-10T00:05:00.000Z',
  },
  {
    id: 'dept_operations',
    code: 'operations',
    name: 'Operations',
    parentId: 'dept_headquarters',
    order: 30,
    leader: 'Operations Lead',
    enabled: true,
    createdAt: '2026-06-10T00:10:00.000Z',
    updatedAt: '2026-06-10T00:10:00.000Z',
  },
];
