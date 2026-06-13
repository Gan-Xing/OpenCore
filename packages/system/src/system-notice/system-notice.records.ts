export type SystemNoticeStatus = 'archived' | 'draft' | 'published';

export type SystemNoticeType = 'announcement' | 'maintenance' | 'security';

export type SystemNoticeAudience = 'admin' | 'all';

export type SystemNoticeDeliveryChannel = 'in_app';

export type SystemNoticeDeliveryStatus = 'delivered' | 'read';

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

export type SystemNoticeDeliveryRecord = {
  id: string;
  noticeId: string;
  userId: string;
  username: string;
  displayName: string;
  channel: SystemNoticeDeliveryChannel;
  status: SystemNoticeDeliveryStatus;
  title: string;
  content: string;
  type: SystemNoticeType;
  audience: SystemNoticeAudience;
  deliveredAt: string;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type SystemNoticeTemplateRecord = {
  id: string;
  code: string;
  name: string;
  type: SystemNoticeType;
  titleTemplate: string;
  contentTemplate: string;
  params: readonly string[];
  enabled: boolean;
  remark?: string;
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

export const seedSystemNoticeTemplates: readonly SystemNoticeTemplateRecord[] =
  [
    {
      id: 'notice_template_release_window',
      code: 'release.window',
      name: 'Release Window',
      type: 'announcement',
      titleTemplate: 'Release window: {{version}}',
      contentTemplate:
        'Version {{version}} is scheduled for {{window}}. Owner: {{owner}}.',
      params: ['owner', 'version', 'window'],
      enabled: true,
      remark: 'Default in-site notice template for release announcements.',
      createdAt: '2026-06-10T00:10:00.000Z',
      updatedAt: '2026-06-10T00:10:00.000Z',
    },
  ];
