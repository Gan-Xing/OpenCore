import { EventEmitter } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  assertS3PrefixReadable,
  assertSafeFileAssetInput,
  createFileAssetStorageKey,
  FileStorageService,
  LocalFileStorage,
  normalizeObjectPrefix,
  readFileStorageOptionsFromEnv,
  type FileStorage,
  type S3PrefixProbeClient,
} from './index';

describe('@opencore/file', () => {
  it('normalizes file storage options from env with local defaults', () => {
    expect(readFileStorageOptionsFromEnv({})).toMatchObject({
      driver: 'local',
      objectPrefix: 'runtime/',
      local: {
        rootPath: expect.stringContaining('.opencore/storage'),
      },
      s3: {
        endpoint: 'http://localhost:9002',
        region: 'us-east-1',
        bucket: 'opencore',
        prefix: 'runtime/',
        accessKeyId: 'opencore-local-access-key',
        secretAccessKey: 'opencore-local-secret-key',
        forcePathStyle: true,
      },
    });

    expect(
      readFileStorageOptionsFromEnv({
        FILE_STORAGE_DRIVER: 's3',
        FILE_STORAGE_LOCAL_ROOT: '/tmp/opencore-files',
        S3_ENDPOINT: 'https://minio.example.test',
        S3_REGION: 'us-west-2',
        S3_BUCKET: 'opencore-prod',
        S3_PREFIX: 'tenant-a/runtime',
        S3_ACCESS_KEY_ID: 'access',
        S3_SECRET_ACCESS_KEY: 'secret',
        S3_FORCE_PATH_STYLE: 'false',
      }),
    ).toMatchObject({
      driver: 's3',
      objectPrefix: 'tenant-a/runtime/',
      local: {
        rootPath: '/tmp/opencore-files',
      },
      s3: {
        endpoint: 'https://minio.example.test',
        region: 'us-west-2',
        bucket: 'opencore-prod',
        prefix: 'tenant-a/runtime/',
        accessKeyId: 'access',
        secretAccessKey: 'secret',
        forcePathStyle: false,
      },
    });
  });

  it('creates deterministic safe file asset keys', () => {
    const input = {
      originalName: 'OpenCore Handbook.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 4096,
    };

    expect(createFileAssetStorageKey(input, 'runtime')).toBe(
      'runtime/file-assets/feb8518b1dfe5006-OpenCore-Handbook.pdf',
    );
    expect(normalizeObjectPrefix('tenant-a')).toBe('tenant-a/');
    expect(() =>
      assertSafeFileAssetInput({ ...input, originalName: '../secret.txt' }),
    ).toThrow('File name must be a plain file name.');
    expect(() => normalizeObjectPrefix('/absolute')).toThrow(
      'Object prefix must be a relative prefix.',
    );
  });

  it('stores local objects under the configured root without escaping it', async () => {
    const rootPath = await mkdtemp(join(tmpdir(), 'opencore-file-'));
    const storage = new LocalFileStorage(rootPath);

    try {
      await expect(
        storage.putObject({
          key: 'runtime/file-assets/handbook.txt',
          body: 'hello',
          contentType: 'text/plain',
        }),
      ).resolves.toEqual({
        key: 'runtime/file-assets/handbook.txt',
        sizeBytes: 5,
        checksum: undefined,
      });
      await expect(
        storage.getObject('runtime/file-assets/handbook.txt'),
      ).resolves.toEqual(Buffer.from('hello'));
      await expect(
        storage.objectExists('runtime/file-assets/handbook.txt'),
      ).resolves.toBe(true);
      await expect(storage.listObjects('runtime/file-assets')).resolves.toEqual(
        [
          expect.objectContaining({
            key: 'runtime/file-assets/handbook.txt',
            sizeBytes: 5,
          }),
        ],
      );
      await expect(
        storage.putObject({ key: '../escape.txt', body: 'nope' }),
      ).rejects.toThrow('Storage key must be a relative object key.');
      await expect(
        storage.deleteObject('runtime/file-assets/handbook.txt'),
      ).resolves.toEqual({
        deleted: true,
      });
    } finally {
      await rm(rootPath, { force: true, recursive: true });
    }
  });

  it('stores file assets through FileStorageService', async () => {
    const storage = createMemoryStorage();
    const service = new FileStorageService(
      {
        driver: 'local',
        objectPrefix: 'runtime/',
        local: { rootPath: '/tmp/opencore-files' },
        s3: {
          endpoint: 'http://localhost:9002',
          region: 'us-east-1',
          bucket: 'opencore',
          prefix: 'runtime/',
          accessKeyId: 'access',
          secretAccessKey: 'secret',
          forcePathStyle: true,
        },
      },
      storage,
    );

    const result = await service.storeFileAsset({
      originalName: 'hello.txt',
      mimeType: 'text/plain',
      sizeBytes: 5,
      body: 'hello',
      uploadedBy: 'admin',
    });

    expect(result.key).toBe('runtime/file-assets/038e48271faeb641-hello.txt');
    await expect(service.getObject(result.key)).resolves.toEqual(
      Buffer.from('hello'),
    );
    expect(storage.lastMetadata).toEqual({ 'x-opencore-uploaded-by': 'admin' });
  });

  it('probes S3 prefix readability through an injected MinIO-compatible client', async () => {
    const client = createS3ProbeClient(true);

    await expect(
      assertS3PrefixReadable(
        {
          endpoint: 'http://minio:9000',
          region: 'us-east-1',
          bucket: 'opencore',
          prefix: 'runtime/',
          accessKeyId: 'access',
          secretAccessKey: 'secret',
          forcePathStyle: true,
        },
        {
          timeoutMs: 50,
          createClient: () => client,
        },
      ),
    ).resolves.toBeUndefined();
    expect(client.calls).toEqual([
      'bucketExists:opencore',
      'listObjectsV2:opencore:runtime/:true',
    ]);
  });
});

function createMemoryStorage(): FileStorage & {
  lastMetadata?: Record<string, string>;
} {
  const objects = new Map<string, Buffer>();
  const storage: FileStorage & {
    lastMetadata?: Record<string, string>;
  } = {
    putObject: async (input) => {
      storage.lastMetadata = input.metadata;
      objects.set(input.key, Buffer.from(input.body));
      return {
        key: input.key,
        sizeBytes: Buffer.byteLength(Buffer.from(input.body)),
      };
    },
    getObject: async (key) => objects.get(key),
    deleteObject: async (key) => ({ deleted: objects.delete(key) }),
    objectExists: async (key) => objects.has(key),
    listObjects: async (prefix) =>
      [...objects.entries()]
        .filter(([key]) => key.startsWith(prefix))
        .map(([key, value]) => ({ key, sizeBytes: value.byteLength })),
  };

  return storage;
}

function createS3ProbeClient(exists: boolean): S3PrefixProbeClient & {
  calls: string[];
} {
  const calls: string[] = [];

  return {
    calls,
    bucketExists: async (bucket) => {
      calls.push(`bucketExists:${bucket}`);
      return exists;
    },
    listObjectsV2: (bucket, prefix, recursive) => {
      calls.push(`listObjectsV2:${bucket}:${prefix}:${String(recursive)}`);

      const stream = new EventEmitter() as NodeJS.ReadableStream;

      queueMicrotask(() => {
        stream.emit('data', { name: `${prefix}readme.txt`, size: 12 });
        stream.emit('end');
      });

      return stream;
    },
  };
}
