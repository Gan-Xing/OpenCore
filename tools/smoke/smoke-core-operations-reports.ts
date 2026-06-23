import { disconnectSmokePrisma, getSmokePrisma } from './prisma';
import {
  assertArray,
  assertEqual,
  assertOpenApiPath,
  assertString,
  createTypedSmokeRuntime,
} from './runtime';

const smoke = createTypedSmokeRuntime();
const { apiPrefix, baseUrl, checkDocs, clients, request } = smoke;
const runId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const runSafeId = runId.replace(/[^a-z0-9]/gi, '_').toLowerCase();
const ROOT_TENANT_ID = 'tenant_root';
const FOREIGN_TENANT_ID = 'tenant_operations_report_smoke_foreign';
const FOREIGN_REPORT_ID = `report_foreign_${runSafeId}`;
const FOREIGN_REPORT_CODE = `foreign.report.${runSafeId}`;

async function main() {
  const createdReportCodes: string[] = [];

  try {
    await request('/health/live', { expected: [200] });
    await request('/health/ready', { expected: [200] });

    if (checkDocs) {
      const openApi = await request(`${apiPrefix}/docs-json`, {
        expected: [200],
      });
      assertOpenApiPath(openApi, '/api/optional/reports');
      assertOpenApiPath(openApi, '/api/optional/reports/{code}');
    }

    const loginResponse = await smoke.login();
    const token = assertString(loginResponse.accessToken, 'login accessToken');
    await seedForeignTenantReport();
    await assertForeignTenantReportHidden(token);

    const seededReports = await clients.operations.listReports(token, {
      enabled: true,
      owner: 'admin',
    });
    assertPageContainsId(
      seededReports,
      'report_runtime_health',
      'seeded reports',
    );

    const seededDetail = await clients.operations.getReport(
      token,
      'runtime.health',
    );
    assertEqual(seededDetail.id, 'report_runtime_health', 'seeded report id');
    assertEqual(
      seededDetail.tenantId,
      ROOT_TENANT_ID,
      'seeded report tenant id',
    );

    const created = await clients.operations.createReport(token, {
      code: `smoke.report.${runSafeId}`,
      name: `Smoke report ${runId}`,
      owner: 'admin',
      querySchema: { source: 'smoke.report', runId },
    });
    createdReportCodes.push(created.code);
    assertEqual(created.tenantId, ROOT_TENANT_ID, 'created report tenant id');
    assertEqual(created.owner, 'admin', 'created report owner');

    const listedCreated = await clients.operations.listReports(token, {
      owner: 'admin',
    });
    assertPageContainsId(
      listedCreated,
      created.id,
      'created root reports',
    );

    const detail = await clients.operations.getReport(token, created.code);
    assertEqual(detail.id, created.id, 'created report detail id');
    assertEqual(
      detail.tenantId,
      ROOT_TENANT_ID,
      'created report detail tenant id',
    );

    await cleanupCreatedReports(createdReportCodes);
    createdReportCodes.length = 0;

    console.log(
      JSON.stringify({
        status: 'pass',
        baseUrl,
        apiPrefix,
        checks: [
          'health.live',
          'health.ready',
          ...(checkDocs
            ? [
                'openapi.optional-report-list-path',
                'openapi.optional-report-detail-path',
              ]
            : []),
          'auth.login',
          'operations.reports.foreign-hidden',
          'operations.reports.seeded-list-detail',
          'operations.reports.create',
          'operations.reports.list-filter',
          'operations.reports.detail',
        ],
      }),
    );
  } catch (error) {
    await cleanupCreatedReports(createdReportCodes);
    throw error;
  } finally {
    await cleanupForeignTenantReport().catch(() => undefined);
    await disconnectSmokePrisma();
  }
}

async function seedForeignTenantReport() {
  const prisma = getSmokePrisma();

  await cleanupForeignTenantReport();
  await prisma.tenant.upsert({
    where: { id: FOREIGN_TENANT_ID },
    update: {
      code: 'operations-report-smoke-foreign',
      slug: 'operations-report-smoke-foreign',
      name: 'Operations Report Smoke Foreign',
      status: 'active',
    },
    create: {
      id: FOREIGN_TENANT_ID,
      code: 'operations-report-smoke-foreign',
      slug: 'operations-report-smoke-foreign',
      name: 'Operations Report Smoke Foreign',
      status: 'active',
    },
  });
  await prisma.reportDefinition.create({
    data: {
      id: FOREIGN_REPORT_ID,
      tenantId: FOREIGN_TENANT_ID,
      code: FOREIGN_REPORT_CODE,
      name: `Foreign smoke report ${runId}`,
      description: 'Foreign tenant report smoke fixture.',
      enabled: true,
      owner: 'foreign-admin',
      querySchema: { source: 'foreign.report', runId },
    },
  });
}

async function assertForeignTenantReportHidden(rootToken: string) {
  const list = await clients.operations.listReports(rootToken, {
    enabled: true,
  });
  assertPageExcludesId(list, FOREIGN_REPORT_ID, 'foreign report list');

  await smoke.apiRequest(
    `/optional/reports/${encodeURIComponent(FOREIGN_REPORT_CODE)}`,
    { expected: [404], token: rootToken },
  );
  await assertForeignTenantReportPreserved();
}

async function assertForeignTenantReportPreserved() {
  const report = await getSmokePrisma().reportDefinition.findUnique({
    where: { id: FOREIGN_REPORT_ID },
  });

  if (
    !report ||
    report.tenantId !== FOREIGN_TENANT_ID ||
    report.code !== FOREIGN_REPORT_CODE
  ) {
    throw new Error('Foreign tenant report definition was changed');
  }
}

async function cleanupCreatedReports(codes: readonly string[]) {
  if (codes.length === 0) {
    return;
  }

  await getSmokePrisma().reportDefinition.deleteMany({
    where: { tenantId: ROOT_TENANT_ID, code: { in: [...codes] } },
  });
}

async function cleanupForeignTenantReport() {
  const prisma = getSmokePrisma();

  await prisma.reportDefinition.deleteMany({
    where: { id: FOREIGN_REPORT_ID },
  });
  await prisma.tenant.deleteMany({ where: { id: FOREIGN_TENANT_ID } });
}

function assertPageContainsId(
  page: { items: readonly { id: string }[] },
  id: string,
  label: string,
) {
  assertArray(page.items, `${label} items`);
  if (!page.items.some((item) => item.id === id)) {
    throw new Error(`${label} must contain ${id}`);
  }
}

function assertPageExcludesId(
  page: { items: readonly { id: string }[] },
  id: string,
  label: string,
) {
  assertArray(page.items, `${label} items`);
  if (page.items.some((item) => item.id === id)) {
    throw new Error(`${label} must not contain ${id}`);
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
