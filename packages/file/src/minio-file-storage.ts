import { Client as MinioClient } from 'minio';
import type { FileStorageS3Options } from './file-options';
import { assertStorageKeyAllowed, normalizeObjectPrefix } from './file-key';
import {
  type DeleteFileObjectResult,
  type FileObjectSummary,
  type FileStorage,
  type PutFileObjectInput,
  type StoredFileObject,
  toBodyBuffer,
} from './storage';

export type MinioStorageClient = {
  bucketExists: (bucket: string) => Promise<boolean>;
  putObject: (
    bucket: string,
    key: string,
    payload: Buffer,
    size: number,
    metadata?: Record<string, string>,
  ) => Promise<unknown>;
  getObject: (bucket: string, key: string) => Promise<NodeJS.ReadableStream>;
  removeObject: (bucket: string, key: string) => Promise<void>;
  statObject: (bucket: string, key: string) => Promise<unknown>;
  listObjectsV2: (
    bucket: string,
    prefix: string,
    recursive: boolean,
  ) => NodeJS.ReadableStream;
};

export class MinioFileStorage implements FileStorage {
  constructor(
    private readonly options: FileStorageS3Options,
    private readonly client: MinioStorageClient = createMinioStorageClient(
      options,
    ),
  ) {}

  async putObject(input: PutFileObjectInput): Promise<StoredFileObject> {
    assertStorageKeyAllowed(input.key);

    const payload = toBodyBuffer(input.body);
    await this.client.putObject(
      this.options.bucket,
      input.key,
      payload,
      payload.byteLength,
      createObjectMetadata(input),
    );

    return {
      key: input.key,
      sizeBytes: payload.byteLength,
      checksum: input.checksum,
    };
  }

  async getObject(key: string): Promise<Buffer | undefined> {
    assertStorageKeyAllowed(key);

    try {
      return await streamToBuffer(
        await this.client.getObject(this.options.bucket, key),
      );
    } catch (error) {
      if (isObjectMissingError(error)) {
        return undefined;
      }

      throw error;
    }
  }

  async deleteObject(key: string): Promise<DeleteFileObjectResult> {
    assertStorageKeyAllowed(key);

    try {
      await this.client.removeObject(this.options.bucket, key);
      return { deleted: true };
    } catch (error) {
      if (isObjectMissingError(error)) {
        return { deleted: false };
      }

      throw error;
    }
  }

  async objectExists(key: string): Promise<boolean> {
    assertStorageKeyAllowed(key);

    try {
      await this.client.statObject(this.options.bucket, key);
      return true;
    } catch (error) {
      if (isObjectMissingError(error)) {
        return false;
      }

      throw error;
    }
  }

  async listObjects(prefix: string): Promise<readonly FileObjectSummary[]> {
    return consumeObjectList(
      this.client.listObjectsV2(
        this.options.bucket,
        normalizeObjectPrefix(prefix),
        true,
      ),
    );
  }
}

export function createMinioStorageClient(
  options: FileStorageS3Options,
): MinioStorageClient {
  const endpoint = new URL(options.endpoint);
  const useSSL = endpoint.protocol === 'https:';

  return new MinioClient({
    endPoint: endpoint.hostname,
    port: endpoint.port ? Number(endpoint.port) : useSSL ? 443 : 80,
    useSSL,
    accessKey: options.accessKeyId,
    secretKey: options.secretAccessKey,
    region: options.region,
    pathStyle: options.forcePathStyle,
    retryOptions: { disableRetry: true },
  }) as unknown as MinioStorageClient;
}

function createObjectMetadata(
  input: PutFileObjectInput,
): Record<string, string> | undefined {
  const metadata = {
    ...input.metadata,
    ...(input.contentType ? { 'content-type': input.contentType } : {}),
    ...(input.checksum ? { 'x-opencore-checksum': input.checksum } : {}),
  };

  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

function consumeObjectList(
  stream: NodeJS.ReadableStream,
): Promise<readonly FileObjectSummary[]> {
  return new Promise((resolve, reject) => {
    const objects: FileObjectSummary[] = [];

    stream.on('data', (item: unknown) => {
      if (!isObjectListItem(item)) {
        return;
      }

      objects.push({
        key: item.name,
        sizeBytes: item.size,
        lastModified: item.lastModified,
      });
    });
    stream.on('error', reject);
    stream.on('end', () =>
      resolve(objects.sort((left, right) => left.key.localeCompare(right.key))),
    );
  });
}

function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    stream.on('data', (chunk: Buffer | string | Uint8Array) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

function isObjectListItem(value: unknown): value is {
  name: string;
  size?: number;
  lastModified?: Date;
} {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    typeof value.name === 'string'
  );
}

function isObjectMissingError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    ['NoSuchKey', 'NotFound', 'NoSuchBucket'].includes(String(error.code))
  );
}
