import { BadRequestException } from '@nestjs/common';
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
    throw new BadRequestException('File name must be a plain file name.');
  }

  if (!input.mimeType.trim() || !input.mimeType.includes('/')) {
    throw new BadRequestException('File MIME type must be valid.');
  }

  if (
    !Number.isFinite(input.sizeBytes) ||
    !Number.isInteger(input.sizeBytes) ||
    input.sizeBytes <= 0
  ) {
    throw new BadRequestException('File size must be positive.');
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
    throw new BadRequestException('Object prefix must be a relative prefix.');
  }

  if (trimmed.toLowerCase().includes('nestweb')) {
    throw new BadRequestException(
      'Object prefix must not reuse a NestWeb prefix.',
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
    throw new BadRequestException('Storage key must be a relative object key.');
  }
}
