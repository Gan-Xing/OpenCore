export type SystemNoticeStatus = 'archived' | 'draft' | 'published';

export type SystemNoticeType = 'announcement' | 'maintenance' | 'security';

export type SystemNoticeAudience = 'admin' | 'all';

export type SystemNoticeRecord = {
  id: string;
  title: string;
  content: string;
  type: SystemNoticeType;
  status: SystemNoticeStatus;
  audience: SystemNoticeAudience;
  pinned: boolean;
  validFrom?: string;
  validTo?: string;
  publishedAt?: string;
  archivedAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export const seedSystemNotices: readonly SystemNoticeRecord[] = [
  {
    id: 'notice_welcome',
    title: 'Welcome to OpenCore',
    content: 'OpenCore system management is ready for internal operators.',
    type: 'announcement',
    status: 'published',
    audience: 'all',
    pinned: true,
    publishedAt: '2026-06-10T00:00:00.000Z',
    createdBy: 'admin',
    createdAt: '2026-06-10T00:00:00.000Z',
    updatedAt: '2026-06-10T00:00:00.000Z',
  },
  {
    id: 'notice_maintenance_window',
    title: 'Maintenance Window',
    content: 'Planned maintenance announcements stay in draft until approved.',
    type: 'maintenance',
    status: 'draft',
    audience: 'admin',
    pinned: false,
    validFrom: '2026-06-12T02:00:00.000Z',
    validTo: '2026-06-12T03:00:00.000Z',
    createdBy: 'admin',
    createdAt: '2026-06-10T00:05:00.000Z',
    updatedAt: '2026-06-10T00:05:00.000Z',
  },
];
