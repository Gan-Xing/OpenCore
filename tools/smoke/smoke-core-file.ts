import {
  assertArray,
  assertEqual,
  assertString,
  createTypedSmokeRuntime,
} from './runtime';

const smoke = createTypedSmokeRuntime();
const { apiPrefix, baseUrl, checkDocs, clients, request } = smoke;

const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

    const listResponse = await clients.system.listFiles(token, {
      page: 1,
      pageSize: 10,
    });
    assertArray(listResponse.items, 'file list items');

    const createdFile = await clients.system.uploadFileAsset(token, {
      checksum: `sha256:${runId}`,
      contentBase64: Buffer.from(fileContent).toString('base64'),
      mimeType: 'text/plain',
      originalName: fileName,
      uploadedBy: 'admin',
    });
    createdFileId = assertString(createdFile.id, 'created file id');
    assertEqual(createdFile.originalName, fileName, 'created file name');
    assertEqual(createdFile.mimeType, 'text/plain', 'created file MIME');
    assertEqual(
      createdFile.sizeBytes,
      Buffer.byteLength(fileContent),
      'created file size',
    );

    const fetchedFile = await clients.system.getFile(token, createdFileId);
    assertEqual(fetchedFile.id, createdFileId, 'detail file id');
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
