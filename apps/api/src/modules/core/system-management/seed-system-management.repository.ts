import { Injectable } from '@nestjs/common';
import type {
  CreateFileAssetDto,
  PageQueryDto,
  UpdateFileAssetDto,
} from './system-management.dto';
import { seedFileAssets, type FileAssetRecord } from './system-management.seed';
import {
  assertSafeFileAsset,
  createExportPreview,
  createPage,
  createStorageKey,
  systemManagementNotFound,
  SystemManagementRepository,
  type ExportPreview,
  type PageResult,
  type SystemManagementExportResource,
} from './system-management.repository';

@Injectable()
export class SeedSystemManagementRepository extends SystemManagementRepository {
  private fileAssets = seedFileAssets.map((file) => ({ ...file }));

  async listFiles(
    query: PageQueryDto = {},
  ): Promise<PageResult<FileAssetRecord>> {
    return createPage(this.fileAssets, query);
  }

  async getFile(id: string): Promise<FileAssetRecord> {
    return { ...this.findFileAsset(id) };
  }

  async createFileAsset(body: CreateFileAssetDto): Promise<FileAssetRecord> {
    assertSafeFileAsset(body);

    const storageKey = createStorageKey(body);
    const file: FileAssetRecord = {
      id: `file_${storageKey.slice(-12)}`,
      originalName: body.originalName,
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes,
      storageKey,
      checksum: body.checksum,
      uploadedBy: body.uploadedBy,
      createdAt: new Date().toISOString(),
    };
    this.fileAssets = [file, ...this.fileAssets];
    return { ...file };
  }

  async updateFileAsset(
    id: string,
    body: UpdateFileAssetDto,
  ): Promise<FileAssetRecord> {
    const file = this.findFileAsset(id);
    const updated = {
      ...file,
      originalName: body.originalName ?? file.originalName,
      mimeType: body.mimeType ?? file.mimeType,
      checksum: body.checksum ?? file.checksum,
      uploadedBy: body.uploadedBy ?? file.uploadedBy,
    };
    assertSafeFileAsset(updated);
    Object.assign(file, updated);
    return { ...file };
  }

  async deleteFile(id: string): Promise<{ deleted: true }> {
    this.findFileAsset(id);
    this.fileAssets = this.fileAssets.filter((file) => file.id !== id);
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

  private findFileAsset(id: string): FileAssetRecord {
    const file = this.fileAssets.find((candidate) => candidate.id === id);

    if (!file) {
      throw systemManagementNotFound(
        'SYSTEM_FILE_ASSET_NOT_FOUND',
        'File asset not found.',
        { id },
      );
    }

    return file;
  }
}
