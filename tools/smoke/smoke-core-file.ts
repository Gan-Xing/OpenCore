import {
  assertArray,
  assertEqual,
  assertIncludes,
  assertString,
  createTypedSmokeRuntime,
} from './runtime';
import { disconnectSmokePrisma, getSmokePrisma } from './prisma';

const smoke = createTypedSmokeRuntime();
const { apiPrefix, baseUrl, checkDocs, clients, request } = smoke;

const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const runSafeId = runId.replace(/[^a-z0-9]/gi, '_').toLowerCase();
const ROOT_TENANT_ID = 'tenant_root';
const FOREIGN_TENANT_ID = 'tenant_file_smoke_foreign';
const FOREIGN_FILE_ID = `file_foreign_${runSafeId}`;
const FOREIGN_FILE_NAME = `foreign-opencore-smoke-${runId}.txt`;
const FOREIGN_STORAGE_KEY = `runtime/tenant/${FOREIGN_TENANT_ID}/file-assets/foreign-${runId}.txt`;
const fileName = `opencore-smoke-${runId}.txt`;
const fileContent = `OpenCore file smoke ${runId}\n`;

async function main() {
  let createdFileId: string | undefined;
  let token: string | undefined;

  try {
    await request('/health/live', { expected: [200] });
    await request('/health/ready', { expected: [200] });

    if (checkDocs) {
      await request(`${apiPrefix}/docs-json`, { expected: [200] });
    }

    const loginResponse = await smoke.login();
    token = assertString(loginResponse.accessToken, 'login accessToken');
    await seedForeignTenantFile();
    await assertForeignTenantFileHidden(token);

    const listResponse = await clients.system.listFiles(token, {
      page: 1,
      pageSize: 10,
    });
    assertArray(listResponse.items, 'file list items');
    assertForeignTenantHidden(listResponse.items, 'file list');

    const createdFile = await clients.system.uploadFileAsset(token, {
      checksum: `sha256:${runId}`,
      contentBase64: Buffer.from(fileContent).toString('base64'),
      mimeType: 'text/plain',
      originalName: fileName,
      uploadedBy: 'admin',
    });
    createdFileId = assertString(createdFile.id, 'created file id');
    assertEqual(createdFile.tenantId, ROOT_TENANT_ID, 'created file tenant');
    assertEqual(createdFile.originalName, fileName, 'created file name');
    assertEqual(createdFile.mimeType, 'text/plain', 'created file MIME');
    assertEqual(
      createdFile.sizeBytes,
      Buffer.byteLength(fileContent),
      'created file size',
    );
    assertStringIncludes(
      createdFile.storageKey,
      `/tenant/${ROOT_TENANT_ID}/`,
      'created file storage key tenant prefix',
    );

    const fetchedFile = await clients.system.getFile(token, createdFileId);
    assertEqual(fetchedFile.id, createdFileId, 'detail file id');
    assertEqual(fetchedFile.tenantId, ROOT_TENANT_ID, 'detail file tenant');
    assertEqual(fetchedFile.originalName, fileName, 'detail file name');

    const downloadedFile = await smoke.apiRequest<string>(
      clients.system.getFileDownloadPath(createdFileId),
      { token },
    );
    assertEqual(downloadedFile, fileContent, 'downloaded file content');

    const updatedFile = await clients.system.updateFileAsset(
      token,
      createdFileId,
      {
        checksum: `sha256:${runId}-updated`,
        uploadedBy: 'operator',
      },
    );
    assertEqual(
      updatedFile.checksum,
      `sha256:${runId}-updated`,
      'updated file checksum',
    );
    assertEqual(updatedFile.uploadedBy, 'operator', 'updated file uploader');

    const exportPreview = await clients.system.exportFiles(token, {
      page: 1,
      pageSize: 10,
    });
    assertEqual(exportPreview.scope, 'current-page', 'file export scope');
    assertArray(exportPreview.columns, 'file export columns');
    assertIncludes(exportPreview.columns, 'tenantId', 'file export columns');
    await assertForeignTenantFilePreserved();

    await cleanupCreatedFile(token, createdFileId);
    createdFileId = undefined;

    console.log(
      JSON.stringify({
        status: 'pass',
        baseUrl,
        apiPrefix,
        checks: [
          'health.live',
          'health.ready',
          ...(checkDocs ? ['openapi.docs-json'] : []),
          'auth.login',
          'core.file.list',
          'core.file.detail',
          'core.file.foreign-hidden',
          'core.file.upload',
          'core.file.download',
          'core.file.update',
          'core.file.export',
          'core.file.delete',
        ],
      }),
    );
  } catch (error) {
    await cleanupCreatedFile(token, createdFileId).catch(() => undefined);
    throw error;
  } finally {
    await cleanupForeignTenantFile().catch(() => undefined);
    await disconnectSmokePrisma().catch(() => undefined);
  }
}

async function cleanupCreatedFile(
  token: string | undefined,
  id: string | undefined,
) {
  if (!token || !id) {
    return;
  }

  await smoke.apiRequest(`/core/files/${encodeURIComponent(id)}`, {
    expected: [200, 404],
    method: 'DELETE',
    token,
  });
}

async function seedForeignTenantFile() {
  const prisma = getSmokePrisma();

  await cleanupForeignTenantFile();
  await prisma.tenant.upsert({
    where: { id: FOREIGN_TENANT_ID },
    update: {
      code: 'file-smoke-foreign',
      slug: 'file-smoke-foreign',
      name: 'File Smoke Foreign',
      status: 'active',
    },
    create: {
      id: FOREIGN_TENANT_ID,
      code: 'file-smoke-foreign',
      slug: 'file-smoke-foreign',
      name: 'File Smoke Foreign',
      status: 'active',
    },
  });
  await prisma.fileAsset.create({
    data: {
      id: FOREIGN_FILE_ID,
      tenantId: FOREIGN_TENANT_ID,
      originalName: FOREIGN_FILE_NAME,
      mimeType: 'text/plain',
      sizeBytes: 42,
      storageKey: FOREIGN_STORAGE_KEY,
      checksum: `sha256:foreign-${runId}`,
      uploadedBy: 'foreign-admin',
    },
  });
}

async function assertForeignTenantFileHidden(token: string) {
  await smoke.apiRequest(`/core/files/${encodeURIComponent(FOREIGN_FILE_ID)}`, {
    expected: [404],
    token,
  });
  await smoke.apiRequest(
    `/core/files/${encodeURIComponent(FOREIGN_FILE_ID)}/download`,
    {
      expected: [404],
      token,
    },
  );
  await smoke.apiRequest(`/core/files/${encodeURIComponent(FOREIGN_FILE_ID)}`, {
    body: {
      uploadedBy: 'root-operator',
    },
    expected: [404],
    method: 'PATCH',
    token,
  });
  await smoke.apiRequest(`/core/files/${encodeURIComponent(FOREIGN_FILE_ID)}`, {
    expected: [404],
    method: 'DELETE',
    token,
  });
  await assertForeignTenantFilePreserved();
}

async function assertForeignTenantFilePreserved() {
  const file = await getSmokePrisma().fileAsset.findUnique({
    where: { id: FOREIGN_FILE_ID },
  });

  if (!file || file.tenantId !== FOREIGN_TENANT_ID) {
    throw new Error('Foreign tenant file asset was changed from root scope');
  }
}

async function cleanupForeignTenantFile() {
  const prisma = getSmokePrisma();

  await prisma.fileAsset.deleteMany({ where: { id: FOREIGN_FILE_ID } });
  await prisma.tenant.deleteMany({ where: { id: FOREIGN_TENANT_ID } });
}

function assertForeignTenantHidden(items: unknown, label: string) {
  if (!Array.isArray(items)) {
    throw new Error(`${label} did not return an array`);
  }

  if (
    items.some(
      (item) =>
        item &&
        typeof item === 'object' &&
        ('id' in item || 'tenantId' in item) &&
        ((item as { id?: unknown }).id === FOREIGN_FILE_ID ||
          (item as { tenantId?: unknown }).tenantId === FOREIGN_TENANT_ID),
    )
  ) {
    throw new Error(`${label} leaked foreign tenant file asset`);
  }
}

function assertStringIncludes(value: string, expected: string, label: string) {
  if (!value.includes(expected)) {
    throw new Error(
      `Expected ${label} to include ${JSON.stringify(expected)}, received ${JSON.stringify(
        value,
      )}`,
    );
  }
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      status: 'fail',
      baseUrl,
      apiPrefix,
      error: error instanceof Error ? error.message : String(error),
    }),
  );
  process.exitCode = 1;
});
