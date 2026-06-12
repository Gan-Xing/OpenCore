import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@opencore/database';
import { loadRuntimeConfig } from '../../../platform/config/runtime-config';
import type {
  CreateFileAssetDto,
  PageQueryDto,
  UpdateFileAssetDto,
} from './system-management.dto';
import type { FileAssetRecord } from './system-management.seed';
import {
  assertSafeFileAsset,
  createExportPreview,
  createPageResult,
  createStorageKey,
  normalizePageQuery,
  SystemManagementRepository,
  type ExportPreview,
  type PageResult,
  type SystemManagementExportResource,
} from './system-management.repository';

type PrismaFileAsset = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  checksum: string | null;
  uploadedBy: string;
  createdAt: Date;
};

@Injectable()
export class PrismaSystemManagementRepository extends SystemManagementRepository {
  private readonly storagePrefix = loadRuntimeConfig().s3.prefix;

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async listFiles(
    query: PageQueryDto = {},
  ): Promise<PageResult<FileAssetRecord>> {
    const total = await this.prisma.fileAsset.count();
    const pagination = normalizePageQuery(query, total);
    const rows = await this.prisma.fileAsset.findMany({
      orderBy: [{ createdAt: 'desc' }, { originalName: 'asc' }],
      skip: pagination.skip,
      take: pagination.take,
    });

    return createPageResult(rows.map(toFileAssetRecord), pagination);
  }

  async getFile(id: string): Promise<FileAssetRecord> {
    return toFileAssetRecord(await this.findFileById(id));
  }

  async createFileAsset(body: CreateFileAssetDto): Promise<FileAssetRecord> {
    assertSafeFileAsset(body);

    const storageKey = createStorageKey(body, this.storagePrefix);

    if (await this.prisma.fileAsset.findUnique({ where: { storageKey } })) {
      throw new ConflictException(`File asset already exists: ${storageKey}`);
    }

    const file = await this.prisma.fileAsset.create({
      data: {
        originalName: body.originalName,
        mimeType: body.mimeType,
        sizeBytes: body.sizeBytes,
        storageKey,
        checksum: body.checksum,
        uploadedBy: body.uploadedBy,
      },
    });

    return toFileAssetRecord(file);
  }

  async updateFileAsset(
    id: string,
    body: UpdateFileAssetDto,
  ): Promise<FileAssetRecord> {
    const existing = await this.findFileById(id);
    const updated = {
      originalName: body.originalName ?? existing.originalName,
      mimeType: body.mimeType ?? existing.mimeType,
      sizeBytes: existing.sizeBytes,
      checksum: body.checksum ?? existing.checksum ?? undefined,
      uploadedBy: body.uploadedBy ?? existing.uploadedBy,
    };
    assertSafeFileAsset(updated);
    const file = await this.prisma.fileAsset.update({
      where: { id },
      data: {
        originalName: updated.originalName,
        mimeType: updated.mimeType,
        checksum: updated.checksum,
        uploadedBy: updated.uploadedBy,
      },
    });

    return toFileAssetRecord(file);
  }

  async deleteFile(id: string): Promise<{ deleted: true }> {
    await this.findFileById(id);
    await this.prisma.fileAsset.delete({ where: { id } });
    return { deleted: true };
  }

  async createExportPreview(
    resource: SystemManagementExportResource,
    query: PageQueryDto = {},
  ): Promise<ExportPreview> {
    const pageByResource = {
      files: this.listFiles(query),
    } satisfies Record<
      SystemManagementExportResource,
      Promise<PageResult<unknown>>
    >;

    return createExportPreview(resource, await pageByResource[resource]);
  }

  private async findFileById(id: string): Promise<PrismaFileAsset> {
    const file = await this.prisma.fileAsset.findUnique({ where: { id } });

    if (!file) {
      throw new NotFoundException(`File asset not found: ${id}`);
    }

    return file;
  }
}

function toFileAssetRecord(file: PrismaFileAsset): FileAssetRecord {
  return {
    id: file.id,
    originalName: file.originalName,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    storageKey: file.storageKey,
    checksum: file.checksum ?? undefined,
    uploadedBy: file.uploadedBy,
    createdAt: file.createdAt.toISOString(),
  };
}
