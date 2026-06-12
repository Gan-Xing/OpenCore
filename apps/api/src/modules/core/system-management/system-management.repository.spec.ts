import { SeedSystemManagementRepository } from './seed-system-management.repository';

describe('SystemManagementRepository', () => {
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
    await expect(repository.getFile(file.id)).resolves.toMatchObject({
      id: file.id,
      originalName: 'handbook.pdf',
    });
    await expect(
      repository.updateFileAsset(file.id, {
        checksum: 'sha256:updated',
        originalName: 'handbook-v2.pdf',
      }),
    ).resolves.toMatchObject({
      checksum: 'sha256:updated',
      originalName: 'handbook-v2.pdf',
      storageKey: file.storageKey,
    });
    await expect(repository.deleteFile(file.id)).resolves.toEqual({
      deleted: true,
    });
  });

  it('creates current-page export previews', async () => {
    const repository = new SeedSystemManagementRepository();

    await expect(
      repository.createExportPreview('files'),
    ).resolves.toMatchObject({
      columns: ['originalName', 'mimeType', 'sizeBytes', 'storageKey'],
    });
  });
});
