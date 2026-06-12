import type { FileStorageS3Options } from './file-options';
import {
  createMinioStorageClient,
  type MinioStorageClient,
} from './minio-file-storage';

export type S3PrefixProbeOptions = {
  timeoutMs?: number;
  createClient?: (options: FileStorageS3Options) => S3PrefixProbeClient;
};

export type S3PrefixProbeClient = Pick<MinioStorageClient, 'listObjectsV2'> & {
  bucketExists: (bucket: string) => Promise<boolean>;
};

const DEFAULT_S3_PROBE_TIMEOUT_MS = 2_000;

export async function assertS3PrefixReadable(
  options: FileStorageS3Options,
  probeOptions: S3PrefixProbeOptions = {},
): Promise<void> {
  const client = probeOptions.createClient
    ? probeOptions.createClient(options)
    : createMinioStorageClient(options);
  const timeoutMs = probeOptions.timeoutMs ?? DEFAULT_S3_PROBE_TIMEOUT_MS;
  const exists = await withTimeout(
    client.bucketExists(options.bucket),
    timeoutMs,
  );

  if (!exists) {
    throw new Error('OpenCore S3 bucket is missing');
  }

  await withTimeout(
    consumeObjectPrefix(client, options.bucket, options.prefix),
    timeoutMs,
  );
}

function consumeObjectPrefix(
  client: S3PrefixProbeClient,
  bucket: string,
  prefix: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const stream = client.listObjectsV2(bucket, prefix, true);

    stream.on('data', () => undefined);
    stream.on('error', reject);
    stream.on('end', resolve);
  });
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('file storage probe timeout'));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}
