import { randomUUID } from 'node:crypto';
import { PrismaService } from '@opencore/database';
import { PrismaSystemManagementRepository } from './prisma-system-management.repository';

describe('PrismaSystemManagementRepository integration', () => {
  const prisma = new PrismaService();
  const repository = new PrismaSystemManagementRepository(prisma);
  const testRunId = randomUUID().slice(0, 8);
  const fileName = `r4-test-${testRunId}.txt`;

  beforeEach(async () => {
    await cleanupTestRows();
  });

  afterEach(async () => {
    await cleanupTestRows();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('reads seeded system management records from PostgreSQL', async () => {
    await expect(
      repository.listFiles({ page: 1, pageSize: 20 }),
    ).resolves.toEqual(
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({
            storageKey: 'runtime/file-assets/opencore-readme.txt',
          }),
        ]),
      }),
    );
  });

  it('persists file metadata CRUD through Prisma', async () => {
    const file = await repository.createFileAsset({
      originalName: fileName,
      mimeType: 'text/plain',
      sizeBytes: 64,
      uploadedBy: 'admin',
    });

    expect(file.storageKey).toContain('file-assets/');
    expect(file.originalName).toBe(fileName);
    await expect(repository.getFile(file.id)).resolves.toMatchObject({
      id: file.id,
      originalName: fileName,
    });
    await expectHttpExceptionCode(
      repository.createFileAsset({
        originalName: fileName,
        mimeType: 'text/plain',
        sizeBytes: 64,
        uploadedBy: 'admin',
      }),
      'SYSTEM_FILE_ASSET_EXISTS',
    );
    await expectHttpExceptionCode(
      repository.getFile(`missing_${testRunId}`),
      'SYSTEM_FILE_ASSET_NOT_FOUND',
    );
    await expect(
      repository.createExportPreview('files', { page: 1, pageSize: 20 }),
    ).resolves.toMatchObject({
      scope: 'current-page',
      rowCount: expect.any(Number),
    });

    await expect(repository.deleteFile(file.id)).resolves.toEqual({
      deleted: true,
    });
  });

  async function cleanupTestRows(): Promise<void> {
    await prisma.fileAsset.deleteMany({
      where: { originalName: fileName },
    });
  }
});

async function expectHttpExceptionCode(
  promise: Promise<unknown>,
  code: string,
): Promise<void> {
  try {
    await promise;
  } catch (error) {
    expect(getHttpExceptionResponse(error)).toMatchObject({ code });
    return;
  }

  throw new Error(`Expected HTTP exception code ${code}`);
}

function getHttpExceptionResponse(error: unknown): unknown {
  if (
    error &&
    typeof error === 'object' &&
    'getResponse' in error &&
    typeof error.getResponse === 'function'
  ) {
    return error.getResponse();
  }

  return undefined;
}
