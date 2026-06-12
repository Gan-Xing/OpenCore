import {
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { assertStorageKeyAllowed, normalizeObjectPrefix } from './file-key';
import {
  type DeleteFileObjectResult,
  type FileObjectSummary,
  type FileStorage,
  type PutFileObjectInput,
  type StoredFileObject,
  toBodyBuffer,
} from './storage';

export class LocalFileStorage implements FileStorage {
  private readonly rootPath: string;

  constructor(rootPath: string) {
    this.rootPath = resolve(rootPath);
  }

  async putObject(input: PutFileObjectInput): Promise<StoredFileObject> {
    assertStorageKeyAllowed(input.key);

    const payload = toBodyBuffer(input.body);
    const targetPath = this.resolveObjectPath(input.key);
    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, payload, { flag: 'w' });

    return {
      key: input.key,
      sizeBytes: payload.byteLength,
      checksum: input.checksum,
    };
  }

  async getObject(key: string): Promise<Buffer | undefined> {
    assertStorageKeyAllowed(key);

    try {
      return await readFile(this.resolveObjectPath(key));
    } catch (error) {
      if (isNotFoundError(error)) {
        return undefined;
      }

      throw error;
    }
  }

  async deleteObject(key: string): Promise<DeleteFileObjectResult> {
    assertStorageKeyAllowed(key);

    try {
      await rm(this.resolveObjectPath(key));
      return { deleted: true };
    } catch (error) {
      if (isNotFoundError(error)) {
        return { deleted: false };
      }

      throw error;
    }
  }

  async objectExists(key: string): Promise<boolean> {
    assertStorageKeyAllowed(key);

    try {
      await stat(this.resolveObjectPath(key));
      return true;
    } catch (error) {
      if (isNotFoundError(error)) {
        return false;
      }

      throw error;
    }
  }

  async listObjects(prefix: string): Promise<readonly FileObjectSummary[]> {
    const normalizedPrefix = normalizeObjectPrefix(prefix);
    const prefixPath = this.resolveObjectPath(normalizedPrefix);

    try {
      await stat(prefixPath);
    } catch (error) {
      if (isNotFoundError(error)) {
        return [];
      }

      throw error;
    }

    return this.listObjectDirectory(prefixPath, normalizedPrefix);
  }

  private async listObjectDirectory(
    directory: string,
    prefix: string,
  ): Promise<readonly FileObjectSummary[]> {
    const entries = await readdir(directory, { withFileTypes: true });
    const summaries: FileObjectSummary[] = [];

    for (const entry of entries) {
      const objectKey = `${prefix}${entry.name}`;
      const objectPath = join(directory, entry.name);

      if (entry.isDirectory()) {
        summaries.push(
          ...(await this.listObjectDirectory(objectPath, `${objectKey}/`)),
        );
        continue;
      }

      const objectStat = await stat(objectPath);
      summaries.push({
        key: objectKey,
        sizeBytes: objectStat.size,
        lastModified: objectStat.mtime,
      });
    }

    return summaries.sort((left, right) => left.key.localeCompare(right.key));
  }

  private resolveObjectPath(key: string): string {
    assertStorageKeyAllowed(key);

    const targetPath = resolve(this.rootPath, key);
    const relativePath = relative(this.rootPath, targetPath);

    if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
      throw new Error('Storage key escapes the local storage root.');
    }

    return targetPath;
  }
}

function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  );
}
