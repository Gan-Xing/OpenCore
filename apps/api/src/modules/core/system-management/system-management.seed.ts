export {
  seedDictTypes,
  seedSystemConfigs,
  seedSystemNotices,
  type DictItemRecord,
  type DictTypeRecord,
  type SystemConfigRecord,
  type SystemNoticeRecord,
} from '@opencore/system/records';
export {
  seedAuditLogs,
  seedLoginLogs,
  type AuditLogRecord,
  type LoginLogRecord,
} from '@opencore/audit/records';

export type FileAssetRecord = {
  id: string;
  tenantId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  checksum?: string;
  uploadedBy: string;
  createdAt: string;
};

export const seedFileAssets: readonly FileAssetRecord[] = [
  {
    id: 'file_readme',
    tenantId: 'tenant_root',
    originalName: 'opencore-readme.txt',
    mimeType: 'text/plain',
    sizeBytes: 512,
    storageKey: 'runtime/tenant/tenant_root/file-assets/opencore-readme.txt',
    checksum: 'sha256:readme',
    uploadedBy: 'admin',
    createdAt: '2026-06-10T00:00:00.000Z',
  },
];
