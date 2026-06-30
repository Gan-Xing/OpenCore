#!/usr/bin/env node

import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { assertString, formatBody, trimTrailingSlash } from './runtime';

type CdpResult = {
  exceptionDetails?: unknown;
  result?: {
    description?: string;
    value?: unknown;
  };
};

type NetworkEntry = {
  status: number;
  url: string;
};

type ChromeInstance = {
  child: ChildProcessWithoutNullStreams;
  profileDir: string;
  wsUrl: string;
};

const adminBaseUrl = trimTrailingSlash(
  process.env.OPENCORE_SMOKE_ADMIN_BASE_URL ?? 'http://127.0.0.1:39174',
);
const timeoutMs = Number(process.env.OPENCORE_SMOKE_TIMEOUT_MS ?? 30000);
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const adminUsername = process.env.OPENCORE_SMOKE_ADMIN_USERNAME || 'admin';
const adminPasswordCandidates = [
  process.env.OPENCORE_SMOKE_ADMIN_PASSWORD,
  process.env.BOOTSTRAP_ADMIN_PASSWORD,
  'admin123',
].filter((candidate, index, candidates): candidate is string => {
  return Boolean(candidate) && candidates.indexOf(candidate) === index;
});

const expectedChineseText = [
  '行业应用',
  '线索',
  '客户',
  '待办任务',
  '未结管道',
  '联系人',
  '商机',
  '任务',
  '标签',
  '动态',
  '租户',
  '名称',
  '编号',
  '负责人',
  '状态',
  '操作',
  '已合格',
] as const;

const forbiddenEnglishText = [
  'Open Tasks',
  'Open Pipeline',
  'Leads',
  'Customers',
  'Contacts',
  'Opportunities',
  'Tasks',
  'Tags',
  'Activity',
  'Tenant',
  'Name',
  'Number',
  'Owner',
  'Status',
  'Action',
  'qualified',
  '$68,000.00',
  'pages.industry.crm',
] as const;

async function main() {
  let chrome: ChromeInstance | undefined;
  let page: CdpPage | undefined;
  const networkEntries: NetworkEntry[] = [];

  try {
    const adminToken = await resolveAdminToken();
    chrome = await launchChrome();
    page = await CdpPage.connect(await createPageTarget(chrome.wsUrl));
    page.on('Network.responseReceived', (params) => {
      const response = readNetworkResponse(params);

      if (response) {
        networkEntries.push(response);
      }
    });

    await page.send('Page.enable');
    await page.send('Runtime.enable');
    await page.send('Network.enable');
    await page.send('Page.navigate', {
      url: `${adminBaseUrl}/user/login?admin-crm-i18n-smoke=${runId}`,
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
      url: `${adminBaseUrl}/industry/crm?admin-crm-i18n-smoke=${runId}`,
    });
    await waitForExpression(
      page,
      'document.readyState === "complete"',
      'Admin CRM page load',
    );
    await waitForCondition(
      () =>
        networkEntries.some(
          (entry) =>
            entry.status === 200 &&
            /\/api\/industry\/crm\/leads(?:\?|$)/u.test(entry.url),
        ),
      'Admin CRM live leads request',
    );
    await waitForExpression(
      page,
      `document.body.innerText.includes('未结管道') && document.body.innerText.includes('已合格')`,
      'Admin CRM zh-CN text settled',
    );

    const state = await evaluate(
      page,
      `
(() => {
  const text = document.body.innerText;
  return {
    href: window.location.href,
    missing: ${JSON.stringify(expectedChineseText)}.filter((value) => !text.includes(value)),
    forbidden: ${JSON.stringify(forbiddenEnglishText)}.filter((value) => text.includes(value)),
    text: text.slice(0, 2000),
  };
})()
`,
    );

    if (!isRecord(state)) {
      throw new Error(`Admin CRM i18n state is invalid: ${formatBody(state)}`);
    }

    if (Array.isArray(state.missing) && state.missing.length > 0) {
      throw new Error(
        `Admin CRM page is missing zh-CN text ${formatBody(
          state.missing,
        )}: ${String(state.text)}`,
      );
    }

    if (Array.isArray(state.forbidden) && state.forbidden.length > 0) {
      throw new Error(
        `Admin CRM page still displays English/raw text ${formatBody(
          state.forbidden,
        )}: ${String(state.text)}`,
      );
    }

    console.log(
      JSON.stringify({
        status: 'pass',
        baseUrl: adminBaseUrl,
        checks: [
          'admin.public-crm.authenticated-access',
          'admin.public-crm.live-list-request',
          'admin.public-crm.zh-cn-summary',
          'admin.public-crm.zh-cn-tabs',
          'admin.public-crm.zh-cn-table',
          'admin.public-crm.zh-cn-status-values',
          'admin.public-crm.no-raw-keys',
          'admin.public-crm.no-english-fallbacks',
        ],
      }),
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        status: 'fail',
        baseUrl: adminBaseUrl,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    process.exitCode = 1;
  } finally {
    page?.close();
    cleanupChrome(chrome);
  }
}

async function resolveAdminToken(): Promise<string> {
  let lastStatus = 0;

  for (const password of adminPasswordCandidates) {
    const response = await fetch(`${adminBaseUrl}/api/auth/login`, {
      body: JSON.stringify({ password, username: adminUsername }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });

    lastStatus = response.status;
    if (response.ok) {
      const body = (await response.json()) as { accessToken?: unknown };
      return assertString(body.accessToken, 'Admin CRM smoke accessToken');
    }
  }

  throw new Error(
    `Unable to authenticate Admin CRM smoke user ${adminUsername}; last status ${lastStatus}.`,
  );
}

async function launchChrome(): Promise<ChromeInstance> {
  const executable = findChromeExecutable();
  const profileDir = mkdtempSync(join(tmpdir(), 'opencore-admin-crm-smoke-'));
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
    '--window-size=1280,900',
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
    'Chrome or Chromium is required for Admin CRM smoke. Set OPENCORE_SMOKE_CHROME_BIN.',
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

function readNetworkResponse(params: unknown): NetworkEntry | undefined {
  if (!isRecord(params) || !isRecord(params.response)) {
    return undefined;
  }

  const { response } = params;

  if (typeof response.url !== 'string' || typeof response.status !== 'number') {
    return undefined;
  }

  return {
    status: response.status,
    url: response.url,
  };
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
