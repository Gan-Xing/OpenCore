import { BadRequestException } from '@nestjs/common';
import {
  redactAuditMetadata,
  SystemManagementRepository,
} from './system-management.repository';

describe('SystemManagementRepository', () => {
  it('paginates dictionary records', () => {
    const repository = new SystemManagementRepository();

    expect(repository.listDicts({ page: 1, pageSize: 1 })).toMatchObject({
      page: 1,
      pageSize: 1,
      total: 2,
      totalPages: 2,
    });
  });

  it('supports CRUD for dictionaries and safe system config', () => {
    const repository = new SystemManagementRepository();
    const dict = repository.createDict({
      code: 'sample.status',
      name: 'Sample Status',
      items: [],
    });

    expect(dict.code).toBe('sample.status');
    expect(
      repository.updateDict('sample.status', { enabled: false }).enabled,
    ).toBe(false);
    expect(repository.deleteDict('sample.status')).toEqual({ deleted: true });

    const config = repository.createConfig({
      key: 'sample.enabled',
      value: 'true',
      valueType: 'boolean',
    });

    expect(config.public).toBe(false);
    expect(
      repository.updateConfig('sample.enabled', { value: 'false' }).value,
    ).toBe('false');
    expect(repository.deleteConfig('sample.enabled')).toEqual({
      deleted: true,
    });
  });

  it('blocks secret-like config keys', () => {
    const repository = new SystemManagementRepository();

    expect(() =>
      repository.createConfig({
        key: 'auth.token.secret',
        value: 'unsafe',
        valueType: 'string',
      }),
    ).toThrow(BadRequestException);
  });

  it('creates generic file assets without provider semantics', () => {
    const repository = new SystemManagementRepository();
    const file = repository.createFileAsset({
      originalName: 'handbook.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
      uploadedBy: 'admin',
    });

    expect(file.storageKey).toContain('file-assets/');
    expect(file.originalName).toBe('handbook.pdf');
    expect(repository.deleteFile(file.id)).toEqual({ deleted: true });
  });

  it('redacts sensitive audit metadata recursively', () => {
    expect(
      redactAuditMetadata({
        username: 'admin',
        password: 'admin123',
        nested: {
          token: 'secret-token',
        },
      }),
    ).toEqual({
      username: 'admin',
      password: '[REDACTED]',
      nested: {
        token: '[REDACTED]',
      },
    });

    const repository = new SystemManagementRepository();
    expect(repository.listAuditLogs().items[0].metadata).toMatchObject({
      password: '[REDACTED]',
      authorization: '[REDACTED]',
    });
  });

  it('creates current-page export previews', () => {
    const repository = new SystemManagementRepository();

    expect(repository.createExportPreview('login-logs')).toMatchObject({
      filename: 'opencore-login-logs.csv',
      scope: 'current-page',
      rowCount: 2,
    });
  });
});
