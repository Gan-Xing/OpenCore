#!/usr/bin/env node

import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { disconnectSmokePrisma, getSmokePrisma } from './prisma';
import { assertString, formatBody, trimTrailingSlash } from './runtime';

type CdpResult = {
  exceptionDetails?: unknown;
  result?: {
    description?: string;
    value?: unknown;
  };
};

type ChromeInstance = {
  child: ChildProcessWithoutNullStreams;
  profileDir: string;
  wsUrl: string;
};

type CreatedBusinessIds = {
  contacts: string[];
  customers: string[];
  leads: string[];
  opportunities: string[];
  tags: string[];
};

type BusinessFixtures = {
  activityTargetId: string;
  contactName: string;
  customerName: string;
  leadName: string;
  opportunityName: string;
  tagName: string;
  taskTitle: string;
};

type NetworkFailure = {
  status: number;
  url: string;
};

const ROOT_TENANT_ID = 'tenant_root';
const adminBaseUrl = trimTrailingSlash(
  process.env.OPENCORE_SMOKE_ADMIN_BASE_URL ??
    process.env.OPENCORE_SMOKE_BASE_URL ??
    'http://127.0.0.1:39174',
);
const apiBaseUrl = trimTrailingSlash(
  process.env.OPENCORE_SMOKE_ADMIN_API_BASE_URL ?? adminBaseUrl,
);
const timeoutMs = Number(process.env.OPENCORE_SMOKE_TIMEOUT_MS ?? 30000);
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const runSafeId = runId.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 40);
const adminUsername = process.env.OPENCORE_SMOKE_ADMIN_USERNAME || 'admin';
const adminPasswordCandidates = [
  process.env.OPENCORE_SMOKE_ADMIN_PASSWORD,
  process.env.BOOTSTRAP_ADMIN_PASSWORD,
  'admin123',
].filter((candidate, index, candidates): candidate is string => {
  return Boolean(candidate) && candidates.indexOf(candidate) === index;
});

async function main() {
  let chrome: ChromeInstance | undefined;
  let page: CdpPage | undefined;
  const browserFailures: string[] = [];
  const networkFailures: NetworkFailure[] = [];
  const created: CreatedBusinessIds = {
    contacts: [],
    customers: [],
    leads: [],
    opportunities: [],
    tags: [],
  };

  try {
    const adminToken = await resolveAdminToken();
    const fixtures = await seedBusinessFixtures(adminToken, created);

    chrome = await launchChrome();
    page = await CdpPage.connect(await createPageTarget(chrome.wsUrl));
    page.on('Runtime.exceptionThrown', (params) => {
      browserFailures.push(readRuntimeException(params));
    });
    page.on('Log.entryAdded', (params) => {
      const entry = readLogEntry(params);
      if (entry) browserFailures.push(entry);
    });
    page.on('Network.responseReceived', (params) => {
      const failure = readApiFailure(params);
      if (failure) networkFailures.push(failure);
    });

    await page.send('Page.enable');
    await page.send('Runtime.enable');
    await page.send('Log.enable');
    await page.send('Network.enable');
    await page.send('Page.navigate', {
      url: `${adminBaseUrl}/user/login?admin-business-actions-smoke=${runId}`,
    });
    await waitForExpression(
      page,
      'document.readyState === "complete"',
      'Admin login page load',
    );
    await evaluate(
      page,
      `
localStorage.setItem('umi_locale', 'zh-CN');
localStorage.setItem('opencore.admin.token', ${JSON.stringify(adminToken)});
true;
`,
    );
    await page.send('Page.navigate', {
      url: `${adminBaseUrl}/business/leads?admin-business-actions-smoke=${runId}`,
    });
    await waitForExpression(
      page,
      'document.readyState === "complete"',
      'Admin business leads page load',
    );
    await waitForExpression(
      page,
      `document.body.innerText.includes('线索') && document.body.innerText.includes(${JSON.stringify(
        fixtures.leadName,
      )})`,
      'Admin Admin business seeded lead row',
    );
    await assertHealthy(page, browserFailures, networkFailures, 'initial load');

    await clickButtonByText(page, '刷新');
    await waitForExpression(
      page,
      `document.body.innerText.includes(${JSON.stringify(fixtures.leadName)})`,
      'Admin Admin business reload settled',
    );
    await assertHealthy(page, browserFailures, networkFailures, 'reload');
    await clickButtonByText(page, '导出');
    await delay(500);
    await assertHealthy(page, browserFailures, networkFailures, 'export leads');

    await exerciseEntityTab(page, {
      create: true,
      path: '/business/leads',
      rowText: fixtures.leadName,
      tabLabel: '线索',
      actions: [
        { kind: 'drawer', label: 'lead detail', index: 0 },
        { kind: 'modal', label: 'lead edit', index: 1 },
        { kind: 'modal', label: 'lead transfer owner', index: 2 },
        { kind: 'modal', label: 'lead follow up', index: 3 },
        { kind: 'modal', label: 'lead task', index: 4 },
        { kind: 'modal', label: 'lead attachment', index: 5 },
        { kind: 'modal', label: 'lead convert', index: 6 },
        { kind: 'popconfirm', label: 'lead archive', index: 7 },
      ],
      browserFailures,
      networkFailures,
    });

    await exerciseEntityTab(page, {
      create: true,
      path: '/business/accounts',
      rowText: fixtures.customerName,
      tabLabel: '往来单位',
      actions: [
        { kind: 'drawer', label: 'customer detail', index: 0 },
        { kind: 'modal', label: 'customer edit', index: 1 },
        { kind: 'modal', label: 'customer transfer owner', index: 2 },
        { kind: 'modal', label: 'customer follow up', index: 3 },
        { kind: 'modal', label: 'customer task', index: 4 },
        { kind: 'modal', label: 'customer attachment', index: 5 },
        { kind: 'popconfirm', label: 'customer archive', index: 6 },
      ],
      browserFailures,
      networkFailures,
    });

    await exerciseEntityTab(page, {
      create: true,
      path: '/business/contacts',
      rowText: fixtures.contactName,
      tabLabel: '联系人',
      actions: [
        { kind: 'drawer', label: 'contact detail', index: 0 },
        { kind: 'modal', label: 'contact edit', index: 1 },
        { kind: 'modal', label: 'contact follow up', index: 2 },
        { kind: 'modal', label: 'contact task', index: 3 },
        { kind: 'modal', label: 'contact attachment', index: 4 },
        { kind: 'popconfirm', label: 'contact archive', index: 5 },
      ],
      browserFailures,
      networkFailures,
    });

    await exerciseEntityTab(page, {
      create: true,
      path: '/business/opportunities',
      rowText: fixtures.opportunityName,
      tabLabel: '商机',
      actions: [
        { kind: 'drawer', label: 'opportunity detail', index: 0 },
        { kind: 'modal', label: 'opportunity edit', index: 1 },
        { kind: 'modal', label: 'opportunity transfer owner', index: 2 },
        { kind: 'modal', label: 'opportunity follow up', index: 3 },
        { kind: 'modal', label: 'opportunity task', index: 4 },
        { kind: 'modal', label: 'opportunity attachment', index: 5 },
        { kind: 'modal', label: 'opportunity stage', index: 6 },
        { kind: 'popconfirm', label: 'opportunity archive', index: 7 },
      ],
      browserFailures,
      networkFailures,
    });

    await navigateBusinessPage(page, '/business/tasks', '任务');
    await clickSearchButtonsIfPresent(page);
    await waitForRow(page, fixtures.taskTitle, 'task row');
    await openRowAction(page, fixtures.taskTitle, 0, 'task detail');
    await waitForDrawer(page, fixtures.taskTitle);
    await closeDrawer(page);
    await openRowAction(page, fixtures.taskTitle, 1, 'task complete');
    await waitForExpression(
      page,
      `${rowByTextExpression(fixtures.taskTitle)}?.innerText.includes('已完成') === true`,
      'completed task status',
    );
    await assertHealthy(page, browserFailures, networkFailures, 'task actions');

    await exerciseEntityTab(page, {
      create: true,
      path: '/business/tags',
      rowText: fixtures.tagName,
      tabLabel: '标签',
      actions: [
        { kind: 'drawer', label: 'tag detail', index: 0 },
        { kind: 'modal', label: 'tag edit', index: 1 },
      ],
      browserFailures,
      networkFailures,
    });

    await navigateBusinessPage(page, '/business/activity', '动态');
    await waitForExpression(
      page,
      `document.body.innerText.includes(${JSON.stringify(
        fixtures.activityTargetId,
      )})`,
      'activity row',
    );
    await openRowAction(page, fixtures.activityTargetId, 0, 'activity detail');
    await waitForDrawer(page, fixtures.activityTargetId);
    await closeDrawer(page);
    await assertHealthy(
      page,
      browserFailures,
      networkFailures,
      'activity actions',
    );

    console.log(
      JSON.stringify({
        status: 'pass',
        baseUrl: adminBaseUrl,
        apiBaseUrl,
        checks: [
          'admin.business-actions.seeded-fixtures',
          'admin.business-actions.reload',
          'admin.business-actions.export',
          'admin.business-actions.search-reset',
          'admin.business-actions.create-modals',
          'admin.business-actions.detail-drawers',
          'admin.business-actions.edit-modals',
          'admin.business-actions.transfer-follow-task-attach-modals',
          'admin.business-actions.convert-stage-modals',
          'admin.business-actions.archive-popconfirm',
          'admin.business-actions.complete-task',
          'admin.business-actions.activity-detail',
          'admin.business-actions.no-browser-errors',
          'admin.business-actions.no-api-failures',
        ],
      }),
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        status: 'fail',
        baseUrl: adminBaseUrl,
        apiBaseUrl,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    process.exitCode = 1;
  } finally {
    page?.close();
    cleanupChrome(chrome);
    await cleanupCreatedBusiness(created);
    await disconnectSmokePrisma();
  }
}

async function exerciseEntityTab(
  page: CdpPage,
  options: {
    actions: readonly {
      index: number;
      kind: 'drawer' | 'modal' | 'popconfirm';
      label: string;
    }[];
    browserFailures: string[];
    create: boolean;
    networkFailures: NetworkFailure[];
    path: string;
    rowText: string;
    tabLabel: string;
  },
): Promise<void> {
  await navigateBusinessPage(page, options.path, options.tabLabel);
  await clickSearchButtonsIfPresent(page);
  await waitForRow(page, options.rowText, `${options.tabLabel} row`);

  if (options.create) {
    await clickButtonByText(page, '新建');
    await waitForModal(page, `create ${options.tabLabel}`);
    await closeModal(page);
    await assertHealthy(
      page,
      options.browserFailures,
      options.networkFailures,
      `${options.tabLabel} create modal`,
    );
  }

  await clickButtonByText(page, '导出');
  await delay(500);
  await assertHealthy(
    page,
    options.browserFailures,
    options.networkFailures,
    `${options.tabLabel} export`,
  );

  for (const action of options.actions) {
    await waitForRow(page, options.rowText, `${options.tabLabel} row`);
    await openRowAction(page, options.rowText, action.index, action.label);

    if (action.kind === 'drawer') {
      await waitForDrawer(page, options.rowText);
      await closeDrawer(page);
    } else if (action.kind === 'modal') {
      await waitForModal(page, action.label);
      await closeModal(page);
    } else {
      await waitForPopconfirm(page);
      await cancelPopconfirm(page);
    }

    await assertHealthy(
      page,
      options.browserFailures,
      options.networkFailures,
      action.label,
    );
  }
}

async function seedBusinessFixtures(
  token: string,
  created: CreatedBusinessIds,
): Promise<BusinessFixtures> {
  const tag = await apiRequest<Record<string, unknown>>(
    token,
    '/business/core/tags',
    {
      body: {
        code: `ui-${runSafeId}`,
        color: 'magenta',
        name: `UI Tag ${runId}`,
      },
      method: 'POST',
    },
  );
  const tagId = assertString(tag.id, 'created Admin business UI tag id');
  const tagCode = assertString(tag.code, 'created Admin business UI tag code');
  const tagName = assertString(tag.name, 'created Admin business UI tag name');
  created.tags.push(tagId);

  const customer = await apiRequest<Record<string, unknown>>(
    token,
    '/business/core/customers',
    {
      body: {
        email: `ui-customer-${runSafeId}@example.com`,
        name: `UI Customer ${runId}`,
        nextContactAt: '2026-07-10T09:30:00.000Z',
        owner: adminUsername,
        phone: '+1-555-0100',
        region: 'North America',
        source: 'website',
        tags: [tagCode],
      },
      method: 'POST',
    },
  );
  const customerId = assertString(
    customer.id,
    'created Admin business UI customer id',
  );
  const customerName = assertString(
    customer.name,
    'created Admin business UI customer name',
  );
  created.customers.push(customerId);

  const lead = await apiRequest<Record<string, unknown>>(
    token,
    '/business/sales/leads',
    {
      body: {
        company: `UI Lead Company ${runId}`,
        email: `ui-lead-${runSafeId}@example.com`,
        mobile: '+1-555-0200',
        name: `UI Lead ${runId}`,
        nextContactAt: '2026-07-09T08:30:00.000Z',
        owner: adminUsername,
        rating: 'warm',
        source: 'website',
        tags: [tagCode],
      },
      method: 'POST',
    },
  );
  const leadId = assertString(lead.id, 'created Admin business UI lead id');
  const leadName = assertString(
    lead.name,
    'created Admin business UI lead name',
  );
  created.leads.push(leadId);

  const contact = await apiRequest<Record<string, unknown>>(
    token,
    '/business/core/contacts',
    {
      body: {
        customerId,
        decisionRole: 'decision-maker',
        email: `ui-contact-${runSafeId}@example.com`,
        mobile: '+1-555-0300',
        name: `UI Contact ${runId}`,
        owner: adminUsername,
        primary: true,
        title: 'Director',
      },
      method: 'POST',
    },
  );
  const contactId = assertString(
    contact.id,
    'created Admin business UI contact id',
  );
  const contactName = assertString(
    contact.name,
    'created Admin business UI contact name',
  );
  created.contacts.push(contactId);

  const opportunity = await apiRequest<Record<string, unknown>>(
    token,
    '/business/sales/opportunities',
    {
      body: {
        amount: '76000.00',
        customerId,
        expectedCloseAt: '2026-08-20T00:00:00.000Z',
        name: `UI Opportunity ${runId}`,
        owner: adminUsername,
        probability: 60,
        stage: 'qualification',
        tags: [tagCode],
      },
      method: 'POST',
    },
  );
  const opportunityId = assertString(
    opportunity.id,
    'created Admin business UI opportunity id',
  );
  const opportunityName = assertString(
    opportunity.name,
    'created Admin business UI opportunity name',
  );
  created.opportunities.push(opportunityId);

  const task = await apiRequest<Record<string, unknown>>(
    token,
    '/business/core/tasks',
    {
      body: {
        assignee: adminUsername,
        createdBy: adminUsername,
        dueAt: '2026-07-11T10:00:00.000Z',
        priority: 'medium',
        targetId: leadId,
        targetType: 'lead',
        title: `UI Task ${runId}`,
      },
      method: 'POST',
    },
  );
  const taskTitle = assertString(
    task.title,
    'created Admin business UI task title',
  );

  await apiRequest<Record<string, unknown>>(
    token,
    '/business/core/follow-ups',
    {
      body: {
        content: `UI smoke activity ${runId}`,
        createdBy: adminUsername,
        method: 'call',
        nextContactAt: '2026-07-12T10:00:00.000Z',
        outcome: 'UI smoke scheduled.',
        targetId: leadId,
        targetType: 'lead',
      },
      method: 'POST',
    },
  );

  return {
    activityTargetId: leadId,
    contactName,
    customerName,
    leadName,
    opportunityName,
    tagName,
    taskTitle,
  };
}

async function cleanupCreatedBusiness(
  created: CreatedBusinessIds,
): Promise<void> {
  const targetIds = [
    ...created.leads,
    ...created.customers,
    ...created.contacts,
    ...created.opportunities,
  ];
  const hasCreatedRecords =
    targetIds.length > 0 ||
    created.tags.length > 0 ||
    created.customers.length > 0;

  if (!hasCreatedRecords) return;

  const prisma = getSmokePrisma();

  if (targetIds.length > 0) {
    await prisma.businessAuditEvent.deleteMany({
      where: { tenantId: ROOT_TENANT_ID, targetId: { in: targetIds } },
    });
    await prisma.businessOwnerTransfer.deleteMany({
      where: { tenantId: ROOT_TENANT_ID, targetId: { in: targetIds } },
    });
    await prisma.businessAttachment.deleteMany({
      where: { tenantId: ROOT_TENANT_ID, targetId: { in: targetIds } },
    });
    await prisma.businessTask.deleteMany({
      where: { tenantId: ROOT_TENANT_ID, targetId: { in: targetIds } },
    });
    await prisma.businessFollowUp.deleteMany({
      where: { tenantId: ROOT_TENANT_ID, targetId: { in: targetIds } },
    });
  }

  if (created.opportunities.length > 0) {
    await prisma.salesOpportunity.deleteMany({
      where: {
        id: { in: created.opportunities },
        tenantId: ROOT_TENANT_ID,
      },
    });
  }

  if (created.contacts.length > 0) {
    await prisma.businessContact.deleteMany({
      where: {
        id: { in: created.contacts },
        tenantId: ROOT_TENANT_ID,
      },
    });
  }

  if (created.customers.length > 0) {
    await prisma.salesOpportunity.deleteMany({
      where: {
        customerId: { in: created.customers },
        tenantId: ROOT_TENANT_ID,
      },
    });
    await prisma.businessContact.deleteMany({
      where: {
        customerId: { in: created.customers },
        tenantId: ROOT_TENANT_ID,
      },
    });
    await prisma.businessCustomer.deleteMany({
      where: { id: { in: created.customers }, tenantId: ROOT_TENANT_ID },
    });
  }

  if (created.leads.length > 0) {
    await prisma.salesLead.deleteMany({
      where: { id: { in: created.leads }, tenantId: ROOT_TENANT_ID },
    });
  }

  if (created.tags.length > 0) {
    await prisma.businessTag.deleteMany({
      where: { id: { in: created.tags }, tenantId: ROOT_TENANT_ID },
    });
  }
}

async function resolveAdminToken(): Promise<string> {
  let lastStatus = 0;

  for (const password of adminPasswordCandidates) {
    const response = await fetchJson(
      `${apiBaseUrl}/api/auth/login`,
      {
        body: JSON.stringify({ password, username: adminUsername }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      },
      'admin login',
    );

    lastStatus = response.status;
    if (response.ok) {
      const body = (await response.json()) as { accessToken?: unknown };
      return assertString(
        body.accessToken,
        'Admin Admin business actions token',
      );
    }
  }

  throw new Error(
    `Unable to authenticate Admin Admin business actions smoke user ${adminUsername}; last status ${lastStatus}.`,
  );
}

async function apiRequest<T>(
  token: string,
  path: `/${string}`,
  options: {
    body?: unknown;
    expected?: readonly number[];
    method?: 'DELETE' | 'GET' | 'PATCH' | 'POST';
  } = {},
): Promise<T> {
  const response = await fetchJson(
    `${apiBaseUrl}/api${path}`,
    {
      body: options.body ? JSON.stringify(options.body) : undefined,
      headers: {
        authorization: `Bearer ${token}`,
        ...(options.body ? { 'content-type': 'application/json' } : {}),
      },
      method: options.method ?? 'GET',
    },
    `${options.method ?? 'GET'} /api${path}`,
  );
  const contentType = response.headers.get('content-type') || '';
  const responseBody = contentType.includes('application/json')
    ? await response.json()
    : await response.text();
  const expected = options.expected ?? [200, 201];

  if (!expected.includes(response.status)) {
    throw new Error(
      `${options.method ?? 'GET'} /api${path} returned ${
        response.status
      }: ${formatBody(responseBody)}`,
    );
  }

  return responseBody as T;
}

async function fetchJson(
  url: string,
  init: RequestInit,
  label: string,
): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (error) {
    const cause = error instanceof Error && error.cause ? error.cause : error;
    throw new Error(
      `${label} fetch failed: ${
        cause instanceof Error ? cause.message : String(cause)
      }`,
    );
  }
}

async function navigateBusinessPage(
  page: CdpPage,
  path: string,
  label: string,
): Promise<void> {
  await page.send('Page.navigate', {
    url: `${adminBaseUrl}${path}?admin-business-actions-smoke=${runId}`,
  });
  await waitForExpression(
    page,
    'document.readyState === "complete"',
    `business page ${path} load`,
  );
  await waitForExpression(
    page,
    `(() => {
      const text = document.body.innerText;
      return window.location.pathname === ${JSON.stringify(path)}
        && text.includes(${JSON.stringify(label)})
        && !document.querySelector('.ant-tabs-nav');
    })()`,
    `active business page ${label}`,
  );
  await delay(500);
}

async function clickSearchButtonsIfPresent(page: CdpPage): Promise<void> {
  const hasSearch = await evaluate(
    page,
    `Boolean(document.querySelector('.ant-pro-table-search'))`,
  );
  if (!hasSearch) return;

  await clickButtonByText(page, '查询');
  await delay(500);
  await clickButtonByText(page, '重置');
  await delay(500);
}

async function clickButtonByText(page: CdpPage, text: string): Promise<void> {
  await clickElement(page, 'button', text, `button ${text}`);
}

async function clickElement(
  page: CdpPage,
  selector: string,
  text: string,
  label: string,
): Promise<void> {
  const result = await evaluate(
    page,
    `
(() => {
  const normalize = (value) => String(value || '').replace(/\\s+/g, '');
  const expected = normalize(${JSON.stringify(text)});
  const isVisible = (element) => {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
  };
  const elements = Array.from(document.querySelectorAll(${JSON.stringify(
    selector,
  )}));
  const element = elements.find((candidate) => isVisible(candidate) && normalize(candidate.textContent) === expected);
  if (!element) {
    return {
      ok: false,
      reason: 'not-found',
      text: document.body.innerText.slice(0, 2000),
    };
  }
  element.click();
  return { ok: true };
})()
`,
  );
  assertClickResult(result, label);
}

async function waitForRow(
  page: CdpPage,
  rowText: string,
  label: string,
): Promise<void> {
  await waitForExpression(
    page,
    `${rowByTextExpression(rowText)} !== undefined`,
    label,
  );
}

async function openRowAction(
  page: CdpPage,
  rowText: string,
  actionIndex: number,
  label: string,
): Promise<void> {
  const result = await evaluate(
    page,
    `
(() => {
  const row = ${rowByTextExpression(rowText)};
  if (!row) {
    return {
      ok: false,
      reason: 'row-not-found',
      text: document.body.innerText.slice(0, 2000),
    };
  }
  const cells = Array.from(row.querySelectorAll('td'));
  const actionCell = cells[cells.length - 1];
  if (!actionCell) {
    return { ok: false, reason: 'action-cell-not-found', row: row.innerText };
  }
  const buttons = Array.from(actionCell.querySelectorAll('button')).filter((button) => {
    const style = window.getComputedStyle(button);
    const rect = button.getBoundingClientRect();
    return !button.disabled && style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
  });
  const button = buttons[${actionIndex}];
  if (!button) {
    return {
      ok: false,
      reason: 'action-button-not-found',
      buttonCount: buttons.length,
      row: row.innerText,
    };
  }
  button.click();
  return { ok: true, buttonCount: buttons.length };
})()
`,
  );
  assertClickResult(result, label);
  await delay(350);
}

function rowByTextExpression(rowText: string): string {
  return `
Array.from(document.querySelectorAll('.ant-table-tbody tr.ant-table-row')).find((row) => {
  const style = window.getComputedStyle(row);
  const rect = row.getBoundingClientRect();
  return style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    rect.width > 0 &&
    rect.height > 0 &&
    row.innerText.includes(${JSON.stringify(rowText)});
})`;
}

async function waitForDrawer(page: CdpPage, text: string): Promise<void> {
  await waitForExpression(
    page,
    `Boolean(document.querySelector('.ant-drawer .ant-drawer-body')) && document.body.innerText.includes(${JSON.stringify(
      text,
    )})`,
    `drawer ${text}`,
  );
}

async function closeDrawer(page: CdpPage): Promise<void> {
  await evaluate(
    page,
    `
(() => {
  const button = document.querySelector('.ant-drawer .ant-drawer-close');
  if (button) button.click();
  return true;
})()
`,
  );
  await waitForExpression(
    page,
    `!document.querySelector('.ant-drawer .ant-drawer-body')`,
    'drawer closed',
  );
}

async function waitForModal(page: CdpPage, label: string): Promise<void> {
  await waitForExpression(
    page,
    `Boolean(document.querySelector('.ant-modal .ant-modal-body'))`,
    `modal ${label}`,
  );
}

async function closeModal(page: CdpPage): Promise<void> {
  await evaluate(
    page,
    `
(() => {
  const button = document.querySelector('.ant-modal .ant-modal-close');
  if (button) button.click();
  return true;
})()
`,
  );
  await waitForExpression(
    page,
    `!document.querySelector('.ant-modal .ant-modal-body')`,
    'modal closed',
  );
}

async function waitForPopconfirm(page: CdpPage): Promise<void> {
  await waitForExpression(
    page,
    `Boolean(document.querySelector('.ant-popover')) && document.body.innerText.includes('确认归档这条业务记录？')`,
    'archive popconfirm',
  );
}

async function cancelPopconfirm(page: CdpPage): Promise<void> {
  await evaluate(
    page,
    `
(() => {
  const button = document.querySelector('.ant-popover button');
  if (button) button.click();
  return true;
})()
`,
  );
  await waitForExpression(
    page,
    `!document.body.innerText.includes('确认归档这条业务记录？')`,
    'popconfirm closed',
  );
}

async function assertHealthy(
  page: CdpPage,
  browserFailures: readonly string[],
  networkFailures: readonly NetworkFailure[],
  label: string,
): Promise<void> {
  await delay(300);
  const visibleFailure = await evaluate(
    page,
    `
(() => {
  const text = document.body.innerText;
  return ['Application Error', '页面异常', '加载失败', 'Cannot read properties'].find((value) => text.includes(value));
})()
`,
  );

  if (visibleFailure) {
    throw new Error(
      `${label} rendered failure text: ${String(visibleFailure)}`,
    );
  }

  if (browserFailures.length > 0) {
    throw new Error(
      `${label} browser failures: ${browserFailures.join(' | ')}`,
    );
  }

  if (networkFailures.length > 0) {
    throw new Error(
      `${label} API failures: ${networkFailures
        .map((entry) => `${entry.status} ${entry.url}`)
        .join(' | ')}`,
    );
  }
}

function assertClickResult(result: unknown, label: string): void {
  if (!isRecord(result) || result.ok !== true) {
    throw new Error(`${label} click failed: ${formatBody(result)}`);
  }
}

async function launchChrome(): Promise<ChromeInstance> {
  const executable = findChromeExecutable();
  const profileDir = mkdtempSync(
    join(tmpdir(), 'opencore-admin-business-smoke-'),
  );
  const child = spawn(executable, [
    '--headless=new',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--disable-features=Translate',
    '--lang=zh-CN',
    '--no-first-run',
    '--no-default-browser-check',
    '--no-sandbox',
    '--remote-debugging-port=0',
    '--window-size=1440,1000',
    `--user-data-dir=${profileDir}`,
    'about:blank',
  ]);

  try {
    return {
      child,
      profileDir,
      wsUrl: await waitForDevToolsUrl(child),
    };
  } catch (error) {
    cleanupChrome({ child, profileDir, wsUrl: '' });
    throw error;
  }
}

function findChromeExecutable(): string {
  const candidates = [
    process.env.CHROME_BIN,
    process.env.OPENCORE_SMOKE_CHROME_BIN,
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    'Chrome or Chromium is required for Admin Admin business actions smoke. Set OPENCORE_SMOKE_CHROME_BIN.',
  );
}

function waitForDevToolsUrl(
  child: ChildProcessWithoutNullStreams,
): Promise<string> {
  return new Promise((resolve, reject) => {
    let stderr = '';
    const timer = setTimeout(() => {
      cleanup();
      reject(
        new Error(
          `Chrome did not expose DevTools within ${timeoutMs}ms: ${stderr.slice(
            -1000,
          )}`,
        ),
      );
    }, timeoutMs);
    const onData = (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
      const match = stderr.match(/DevTools listening on (ws:\/\/\S+)/u);

      if (match) {
        cleanup();
        resolve(assertString(match[1], 'Chrome DevTools URL'));
      }
    };
    const onExit = (code: number | null, signal: NodeJS.Signals | null) => {
      cleanup();
      reject(
        new Error(
          `Chrome exited before DevTools was ready: code=${code} signal=${signal} stderr=${stderr.slice(
            -1000,
          )}`,
        ),
      );
    };
    const cleanup = () => {
      clearTimeout(timer);
      child.stderr.off('data', onData);
      child.off('exit', onExit);
    };

    child.stderr.on('data', onData);
    child.once('exit', onExit);
  });
}

async function createPageTarget(browserWsUrl: string): Promise<string> {
  const devtoolsBase = browserWsUrl
    .replace(/^ws:/u, 'http:')
    .replace(/\/devtools\/browser\/.+$/u, '');
  const response = await fetch(
    `${devtoolsBase}/json/new?${encodeURIComponent('about:blank')}`,
    { method: 'PUT' },
  );

  if (!response.ok) {
    throw new Error(`Chrome target creation returned ${response.status}`);
  }

  const target = (await response.json()) as { webSocketDebuggerUrl?: unknown };

  return assertString(target.webSocketDebuggerUrl, 'page DevTools URL');
}

class CdpPage {
  private nextId = 1;
  private readonly pending = new Map<
    number,
    {
      reject: (reason?: unknown) => void;
      resolve: (value: unknown) => void;
    }
  >();
  private readonly handlers = new Map<string, ((params: unknown) => void)[]>();

  private constructor(private readonly ws: WebSocket) {
    this.ws.addEventListener('message', (event) => {
      this.handleMessage(event.data);
    });
  }

  static connect(wsUrl: string): Promise<CdpPage> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      const timer = setTimeout(() => {
        ws.close();
        reject(
          new Error(`Unable to connect to page DevTools within ${timeoutMs}ms`),
        );
      }, timeoutMs);

      ws.addEventListener('open', () => {
        clearTimeout(timer);
        resolve(new CdpPage(ws));
      });
      ws.addEventListener('error', () => {
        clearTimeout(timer);
        reject(new Error('Page DevTools WebSocket failed to open'));
      });
    });
  }

  on(method: string, handler: (params: unknown) => void): void {
    const handlers = this.handlers.get(method) ?? [];
    handlers.push(handler);
    this.handlers.set(method, handlers);
  }

  send<T = unknown>(
    method: string,
    params?: Record<string, unknown>,
  ): Promise<T> {
    const id = this.nextId;
    this.nextId += 1;

    return new Promise<unknown>((resolve, reject) => {
      this.pending.set(id, { reject, resolve });
      this.ws.send(JSON.stringify({ id, method, params }));
    }).then((value) => value as T);
  }

  close(): void {
    this.ws.close();
  }

  private handleMessage(data: unknown): void {
    const message = JSON.parse(readMessageData(data)) as {
      error?: { message?: string };
      id?: number;
      method?: string;
      params?: unknown;
      result?: unknown;
    };

    if (typeof message.id === 'number') {
      const pending = this.pending.get(message.id);

      if (!pending) {
        return;
      }

      this.pending.delete(message.id);

      if (message.error) {
        pending.reject(
          new Error(message.error.message ?? 'CDP command failed'),
        );
      } else {
        pending.resolve(message.result);
      }

      return;
    }

    if (message.method) {
      for (const handler of this.handlers.get(message.method) ?? []) {
        handler(message.params);
      }
    }
  }
}

async function evaluate(page: CdpPage, expression: string): Promise<unknown> {
  const result = await page.send<CdpResult>('Runtime.evaluate', {
    awaitPromise: true,
    expression,
    returnByValue: true,
  });

  if (result.exceptionDetails) {
    throw new Error(`Browser evaluation failed: ${formatBody(result)}`);
  }

  return result.result?.value;
}

async function waitForExpression(
  page: CdpPage,
  expression: string,
  label: string,
): Promise<void> {
  await waitForCondition(
    async () => Boolean(await evaluate(page, expression)),
    label,
  );
}

async function waitForCondition(
  predicate: () => boolean | Promise<boolean>,
  label: string,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await predicate()) {
      return;
    }

    await delay(250);
  }

  throw new Error(`${label} did not become true within ${timeoutMs}ms`);
}

function readApiFailure(params: unknown): NetworkFailure | undefined {
  if (!isRecord(params) || !isRecord(params.response)) {
    return undefined;
  }

  const { response } = params;
  if (typeof response.url !== 'string' || typeof response.status !== 'number') {
    return undefined;
  }

  if (response.status < 400 || !response.url.includes('/api/')) {
    return undefined;
  }

  return {
    status: response.status,
    url: response.url,
  };
}

function readRuntimeException(params: unknown): string {
  if (!isRecord(params) || !isRecord(params.exceptionDetails)) {
    return formatBody(params);
  }

  const details = params.exceptionDetails;
  const exception = isRecord(details.exception) ? details.exception : undefined;
  return (
    (typeof exception?.description === 'string' && exception.description) ||
    (typeof exception?.value === 'string' && exception.value) ||
    formatBody(details)
  );
}

function readLogEntry(params: unknown): string | undefined {
  if (!isRecord(params) || !isRecord(params.entry)) return undefined;
  const { entry } = params;
  if (
    typeof entry.level === 'string' &&
    ['error', 'warning'].includes(entry.level) &&
    typeof entry.text === 'string' &&
    !entry.text.includes('favicon')
  ) {
    if (isIgnorableBrowserLog(entry.text)) return undefined;
    return entry.text;
  }
  return undefined;
}

function isIgnorableBrowserLog(text: string): boolean {
  return (
    text.includes("The file at 'blob:http://") &&
    text.includes('was loaded over an insecure connection') &&
    text.includes('This file should be served over HTTPS')
  );
}

function readMessageData(data: unknown): string {
  if (typeof data === 'string') {
    return data;
  }

  if (data instanceof ArrayBuffer) {
    return Buffer.from(data).toString('utf8');
  }

  if (Buffer.isBuffer(data)) {
    return data.toString('utf8');
  }

  return String(data);
}

function cleanupChrome(chrome: ChromeInstance | undefined): void {
  if (!chrome) {
    return;
  }

  chrome.child.kill('SIGTERM');
  rmSync(chrome.profileDir, {
    force: true,
    maxRetries: 3,
    recursive: true,
    retryDelay: 100,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

void main();
