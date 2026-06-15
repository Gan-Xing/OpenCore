import { BadRequestException } from '@nestjs/common';
import { createApiErrorBody } from '@opencore/common';
import { createHash } from 'node:crypto';

export type FileAssetStorageInput = {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
};

export function assertSafeFileAssetInput(input: FileAssetStorageInput): void {
  const fileName = input.originalName.trim();

  if (
    !fileName ||
    fileName.includes('/') ||
    fileName.includes('\\') ||
    fileName.includes('\0')
  ) {
    throw fileBadRequest(
      'FILE_NAME_INVALID',
      'File name must be a plain file name.',
      { field: 'originalName' },
    );
  }

  if (!input.mimeType.trim() || !input.mimeType.includes('/')) {
    throw fileBadRequest(
      'FILE_MIME_TYPE_INVALID',
      'File MIME type must be valid.',
      { field: 'mimeType' },
    );
  }

  if (
    !Number.isFinite(input.sizeBytes) ||
    !Number.isInteger(input.sizeBytes) ||
    input.sizeBytes <= 0
  ) {
    throw fileBadRequest('FILE_SIZE_INVALID', 'File size must be positive.', {
      field: 'sizeBytes',
    });
  }
}

export function createFileAssetStorageKey(
  input: FileAssetStorageInput,
  prefix = 'runtime/',
): string {
  assertSafeFileAssetInput(input);

  const digest = createHash('sha256')
    .update(`${input.originalName}:${input.mimeType}:${input.sizeBytes}`)
    .digest('hex')
    .slice(0, 16);

  return `${normalizeObjectPrefix(prefix)}file-assets/${digest}-${sanitizeFileName(
    input.originalName,
  )}`;
}

export function sanitizeFileName(fileName: string): string {
  const sanitized = fileName.trim().replace(/[^a-zA-Z0-9._-]/g, '-');

  return sanitized.length > 0 ? sanitized : 'file';
}

export function normalizeObjectPrefix(prefix: string): string {
  const trimmed = prefix.trim();

  if (!trimmed) {
    return '';
  }

  if (
    trimmed.startsWith('/') ||
    trimmed.includes('..') ||
    trimmed.includes('\\') ||
    trimmed.includes('\0')
  ) {
    throw fileBadRequest(
      'FILE_OBJECT_PREFIX_INVALID',
      'Object prefix must be a relative prefix.',
      { field: 'prefix' },
    );
  }

  if (trimmed.toLowerCase().includes('nestweb')) {
    throw fileBadRequest(
      'FILE_OBJECT_PREFIX_RESERVED',
      'Object prefix must not reuse a NestWeb prefix.',
      { field: 'prefix' },
    );
  }

  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
}

export function assertStorageKeyAllowed(key: string): void {
  const trimmed = key.trim();

  if (
    !trimmed ||
    trimmed.startsWith('/') ||
    trimmed.includes('..') ||
    trimmed.includes('\\') ||
    trimmed.includes('\0')
  ) {
    throw fileBadRequest(
      'FILE_STORAGE_KEY_INVALID',
      'Storage key must be a relative object key.',
      { field: 'key' },
    );
  }
}

function fileBadRequest(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): BadRequestException {
  return new BadRequestException(
    createApiErrorBody({
      code,
      message,
      details,
    }),
  );
}
