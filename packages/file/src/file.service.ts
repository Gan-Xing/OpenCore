import { Inject, Injectable } from '@nestjs/common';
import { FILE_STORAGE_OPTIONS, type FileStorageOptions } from './file-options';
import {
  assertSafeFileAssetInput,
  createFileAssetStorageKey,
  type FileAssetStorageInput,
} from './file-key';
import { FILE_STORAGE, type FileObjectBody, type FileStorage } from './storage';

export type StoreFileAssetInput = FileAssetStorageInput & {
  body: FileObjectBody;
  checksum?: string;
  uploadedBy?: string;
};

@Injectable()
export class FileStorageService {
  constructor(
    @Inject(FILE_STORAGE_OPTIONS)
    private readonly options: FileStorageOptions,
    @Inject(FILE_STORAGE)
    private readonly storage: FileStorage,
  ) {}

  createAssetKey(input: FileAssetStorageInput): string {
    return createFileAssetStorageKey(input, this.options.objectPrefix);
  }

  async storeFileAsset(input: StoreFileAssetInput) {
    assertSafeFileAssetInput(input);

    const key = this.createAssetKey(input);

    return this.storage.putObject({
      key,
      body: input.body,
      contentType: input.mimeType,
      checksum: input.checksum,
      metadata: input.uploadedBy
        ? { 'x-opencore-uploaded-by': input.uploadedBy }
        : undefined,
    });
  }

  getObject(key: string): Promise<Buffer | undefined> {
    return this.storage.getObject(key);
  }

  deleteObject(key: string) {
    return this.storage.deleteObject(key);
  }

  listObjects(prefix = this.options.objectPrefix) {
    return this.storage.listObjects(prefix);
  }
}
