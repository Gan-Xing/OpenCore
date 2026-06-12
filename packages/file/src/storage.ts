export type FileObjectBody = Buffer | Uint8Array | string;

export type PutFileObjectInput = {
  key: string;
  body: FileObjectBody;
  contentType?: string;
  checksum?: string;
  metadata?: Record<string, string>;
};

export type StoredFileObject = {
  key: string;
  sizeBytes: number;
  checksum?: string;
};

export type FileObjectSummary = {
  key: string;
  sizeBytes?: number;
  lastModified?: Date;
};

export type DeleteFileObjectResult = {
  deleted: boolean;
};

export interface FileStorage {
  putObject(input: PutFileObjectInput): Promise<StoredFileObject>;
  getObject(key: string): Promise<Buffer | undefined>;
  deleteObject(key: string): Promise<DeleteFileObjectResult>;
  objectExists(key: string): Promise<boolean>;
  listObjects(prefix: string): Promise<readonly FileObjectSummary[]>;
}

export const FILE_STORAGE = Symbol('FILE_STORAGE');

export function toBodyBuffer(body: FileObjectBody): Buffer {
  if (Buffer.isBuffer(body)) {
    return body;
  }

  if (typeof body === 'string') {
    return Buffer.from(body);
  }

  return Buffer.from(body);
}
