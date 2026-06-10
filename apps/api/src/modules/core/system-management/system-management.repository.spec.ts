import { BadRequestException } from '@nestjs/common';
import { SeedSystemManagementRepository } from './seed-system-management.repository';
import {
  redactAuditMetadata,
  SystemManagementRepository,
} from './system-management.repository';

describe('SystemManagementRepository', () => {
  it('paginates dictionary records', async () => {
    const repository = new SeedSystemManagementRepository();

    await expect(
      repository.listDicts({ page: 1, pageSize: 1 }),
    ).resolves.toMatchObject({
      page: 1,
      pageSize: 1,
      total: 2,
      totalPages: 2,
    });
  });

  it('supports CRUD for dictionaries and safe system config', async () => {
    const repository: SystemManagementRepository =
      new SeedSystemManagementRepository();
    const dict = await repository.createDict({
      code: 'sample.status',
      name: 'Sample Status',
      items: [],
    });

    expect(dict.code).toBe('sample.status');
    expect(
      (await repository.updateDict('sample.status', { enabled: false }))
        .enabled,
    ).toBe(false);
    await expect(repository.deleteDict('sample.status')).resolves.toEqual({
      deleted: true,
    });

    const config = await repository.createConfig({
      key: 'sample.enabled',
      value: 'true',
      valueType: 'boolean',
    });

    expect(config.public).toBe(false);
    expect(
      (await repository.updateConfig('sample.enabled', { value: 'false' }))
        .value,
    ).toBe('false');
    await expect(repository.deleteConfig('sample.enabled')).resolves.toEqual({
      deleted: true,
    });
  });

  it('blocks secret-like config keys', async () => {
    const repository = new SeedSystemManagementRepository();

    await expect(
      repository.createConfig({
        key: 'auth.token.secret',
        value: 'unsafe',
        valueType: 'string',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('creates generic file assets without provider semantics', async () => {
    const repository = new SeedSystemManagementRepository();
    const file = await repository.createFileAsset({
      originalName: 'handbook.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
      uploadedBy: 'admin',
    });

    expect(file.storageKey).toContain('file-assets/');
    expect(file.originalName).toBe('handbook.pdf');
    await expect(repository.deleteFile(file.id)).resolves.toEqual({
      deleted: true,
    });
  });

  it('redacts sensitive audit metadata recursively', async () => {
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

    const repository = new SeedSystemManagementRepository();
    const auditLogs = await repository.listAuditLogs();

    expect(auditLogs.items[0].metadata).toMatchObject({
      password: '[REDACTED]',
      authorization: '[REDACTED]',
    });
  });

  it('creates current-page export previews', async () => {
    const repository = new SeedSystemManagementRepository();

    await expect(
      repository.createExportPreview('login-logs'),
    ).resolves.toMatchObject({
      filename: 'opencore-login-logs.csv',
      scope: 'current-page',
      rowCount: 2,
    });
  });
});
