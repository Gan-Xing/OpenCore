#!/usr/bin/env node

import {
  assertArray,
  assertEqual,
  assertString,
  createSmokeRuntime,
} from './smoke-helpers.mjs';

const smoke = createSmokeRuntime();
const { apiPrefix, apiRequest, baseUrl, checkDocs, login, request } = smoke;

const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const fileName = `opencore-smoke-${runId}.txt`;
const fileContent = `OpenCore file smoke ${runId}\n`;
let token;
let createdFileId;

try {
  await request('/health/live', { expected: [200] });
  await request('/health/ready', { expected: [200] });

  if (checkDocs) {
    await request(`${apiPrefix}/docs-json`, { expected: [200] });
  }

  const loginResponse = await login();

  token = assertString(loginResponse.accessToken, 'login accessToken');
  smoke.setToken(token);

  const listResponse = await apiRequest('/core/files?page=1&pageSize=10');
  assertArray(listResponse.items, 'file list items');

  const createdFile = await apiRequest('/core/files/upload', {
    method: 'POST',
    body: {
      originalName: fileName,
      mimeType: 'text/plain',
      contentBase64: Buffer.from(fileContent).toString('base64'),
      checksum: `sha256:${runId}`,
      uploadedBy: 'admin',
    },
  });
  createdFileId = assertString(createdFile.id, 'created file id');
  assertEqual(createdFile.originalName, fileName, 'created file name');
  assertEqual(createdFile.mimeType, 'text/plain', 'created file MIME');
  assertEqual(
    createdFile.sizeBytes,
    Buffer.byteLength(fileContent),
    'created file size',
  );

  const fetchedFile = await apiRequest(`/core/files/${createdFileId}`);
  assertEqual(fetchedFile.id, createdFileId, 'detail file id');
  assertEqual(fetchedFile.originalName, fileName, 'detail file name');

  const downloadedFile = await apiRequest(
    `/core/files/${createdFileId}/download`,
  );
  assertEqual(downloadedFile, fileContent, 'downloaded file content');

  const updatedFile = await apiRequest(`/core/files/${createdFileId}`, {
    method: 'PATCH',
    body: {
      checksum: `sha256:${runId}-updated`,
      uploadedBy: 'operator',
    },
  });
  assertEqual(
    updatedFile.checksum,
    `sha256:${runId}-updated`,
    'updated file checksum',
  );
  assertEqual(updatedFile.uploadedBy, 'operator', 'updated file uploader');

  const exportPreview = await apiRequest(
    '/core/files/export?page=1&pageSize=10',
  );
  assertEqual(exportPreview.scope, 'current-page', 'file export scope');
  assertArray(exportPreview.columns, 'file export columns');

  await cleanupCreatedFile();

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
  await cleanupCreatedFile().catch(() => undefined);
  console.error(
    JSON.stringify({
      status: 'fail',
      baseUrl,
      apiPrefix,
      error: error instanceof Error ? error.message : String(error),
    }),
  );
  process.exitCode = 1;
}

async function cleanupCreatedFile() {
  if (!token || !createdFileId) {
    return;
  }

  await apiRequest(`/core/files/${encodeURIComponent(createdFileId)}`, {
    method: 'DELETE',
    expected: [200, 404],
  });
  createdFileId = undefined;
}
