import type { FileStorageOptions } from './file-options';
import { LocalFileStorage } from './local-file-storage';
import { MinioFileStorage } from './minio-file-storage';
import type { FileStorage } from './storage';

export function createFileStorageFromOptions(
  options: FileStorageOptions,
): FileStorage {
  if (options.driver === 's3') {
    return new MinioFileStorage(options.s3);
  }

  return new LocalFileStorage(options.local.rootPath);
}
