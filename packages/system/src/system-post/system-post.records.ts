export type SystemPostRecord = {
  id: string;
  code: string;
  name: string;
  order: number;
  description?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export const seedSystemPosts: readonly SystemPostRecord[] = [
  {
    id: 'post_admin',
    code: 'admin',
    name: 'Administrator',
    order: 10,
    description: 'System administration operator post.',
    enabled: true,
    createdAt: '2026-06-10T00:00:00.000Z',
    updatedAt: '2026-06-10T00:00:00.000Z',
  },
  {
    id: 'post_engineer',
    code: 'engineer',
    name: 'Engineer',
    order: 20,
    description: 'Engineering delivery post.',
    enabled: true,
    createdAt: '2026-06-10T00:05:00.000Z',
    updatedAt: '2026-06-10T00:05:00.000Z',
  },
];
