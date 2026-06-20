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
const expectedLocalizedError = '用户名或密码错误';
const forbiddenBackendError = 'Invalid username or password';

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
      url: `${adminBaseUrl}/user/login?admin-error-ui-smoke=${runId}`,
    });
    await waitForExpression(
      page,
      'document.readyState === "complete"',
      'Admin login page load',
    );
    await evaluate(page, `localStorage.setItem('umi_locale', 'zh-CN'); true;`);
    await page.send('Page.reload', { ignoreCache: true });
    await waitForExpression(
      page,
      'document.readyState === "complete"',
      'Admin login page reload',
    );
    await waitForExpression(
      page,
      `Boolean(document.querySelector('input[name="username"], input#username, input[placeholder="用户名"], input[placeholder="Username"]'))`,
      'Admin login username input',
    );

    const fillResult = await evaluate(
      page,
      createSubmitScript(`missing_${runId}`, `wrong_${runId}`),
    );

    if (!isRecord(fillResult) || fillResult.ok !== true) {
      throw new Error(
        `Unable to submit Admin login form: ${formatBody(fillResult)}`,
      );
    }

    await waitForCondition(
      () =>
        networkEntries.some(
          (entry) =>
            entry.status === 401 && entry.url.includes('/api/auth/login'),
        ),
      'Admin login 401 response',
    );
    await waitForExpression(
      page,
      `document.body.innerText.includes(${JSON.stringify(
        expectedLocalizedError,
      )})`,
      'localized Admin login error',
    );

    const visibleText = String(await evaluate(page, 'document.body.innerText'));

    if (visibleText.includes(forbiddenBackendError)) {
      throw new Error(
        'Admin login error displayed backend fallback text instead of the localized error code message.',
      );
    }

    const duplicatePrefixRequest = networkEntries.find((entry) =>
      entry.url.includes('/api/api/auth/login'),
    );

    if (duplicatePrefixRequest) {
      throw new Error(
        `Admin login posted to duplicated API prefix: ${duplicatePrefixRequest.url}`,
      );
    }

    await evaluate(
      page,
      `localStorage.setItem('opencore.admin.token', ${JSON.stringify(
        adminToken,
      )}); true;`,
    );
    await page.send('Page.navigate', {
      url: `${adminBaseUrl}/dashboard?admin-notice-bell-smoke=${runId}`,
    });
    await waitForExpression(
      page,
      'document.readyState === "complete"',
      'Admin dashboard page load',
    );
    await waitForExpression(
      page,
      `Boolean(Array.from(document.querySelectorAll('button')).find((node) => node.getAttribute('aria-label') === '系统通知收件箱'))`,
      'Admin NoticeBell button',
    );
    await evaluate(
      page,
      `
(() => {
  const button = Array.from(document.querySelectorAll('button')).find((node) => node.getAttribute('aria-label') === '系统通知收件箱');
  if (!(button instanceof HTMLButtonElement)) {
    return false;
  }
  button.click();
  return true;
})()
`,
    );
    await waitForExpression(
      page,
      `Array.from(document.querySelectorAll('.ant-dropdown, .ant-dropdown-menu, [role="menu"]')).some((node) => node.textContent?.includes('查看全部'))`,
      'Admin NoticeBell view-all menu item',
    );
    const noticeBellState = await evaluate(
      page,
      `
(() => {
  const text = Array.from(document.querySelectorAll('.ant-dropdown, .ant-dropdown-menu, [role="menu"]'))
    .map((node) => node.textContent || '')
    .join('\\n');
  return {
    hasEmpty: text.includes('暂无未读系统通知'),
    hasMarkAll: text.includes('全部标为已读'),
    hasRawType: /\\b(announcement|maintenance|security)\\b/.test(text),
    hasViewAll: text.includes('查看全部'),
    text,
  };
})()
`,
    );

    if (!isRecord(noticeBellState) || noticeBellState.hasViewAll !== true) {
      throw new Error(
        `Admin NoticeBell view-all action is not visible: ${JSON.stringify(noticeBellState)}`,
      );
    }

    if (
      noticeBellState.hasMarkAll !== true &&
      noticeBellState.hasEmpty !== true
    ) {
      throw new Error(
        `Admin NoticeBell has neither unread actions nor empty state: ${JSON.stringify(noticeBellState)}`,
      );
    }

    if (noticeBellState.hasRawType === true) {
      throw new Error(
        `Admin NoticeBell displayed raw notice type keys: ${JSON.stringify(noticeBellState)}`,
      );
    }

    await page.send('Emulation.setDeviceMetricsOverride', {
      deviceScaleFactor: 1,
      height: 844,
      mobile: true,
      screenHeight: 844,
      screenWidth: 390,
      width: 390,
    });
    await page.send('Page.navigate', {
      url: `${adminBaseUrl}/system/notices?tab=manage&admin-notices-ui-smoke=${runId}`,
    });
    await waitForExpression(
      page,
      'document.readyState === "complete"',
      'Admin notices page load',
    );
    await waitForExpression(
      page,
      `document.body.innerText.includes('通知管理') && document.body.innerText.includes('系统通知模板')`,
      'Admin notices three-tab page text',
    );
    await waitForExpression(
      page,
      `Boolean(document.querySelector('[data-opencore-notices-mobile-list="manage"]'))`,
      'Admin notices mobile card list',
    );
    const noticesMobileState = await evaluate(
      page,
      `
(() => {
  const text = document.body.innerText;
  return {
    clientWidth: document.documentElement.clientWidth,
    hasDesktopTable: Boolean(document.querySelector('.ant-table-wrapper')),
    hasEmptyState: Boolean(document.querySelector('.ant-empty')) || text.includes('当前筛选条件下没有系统通知') || text.includes('No system notices match'),
    hasMobileCardList: Boolean(document.querySelector('[data-opencore-notices-mobile-list="manage"]')),
    hasMoreActions: text.includes('更多'),
    hasSettingDrawerTrigger: Boolean(document.querySelector('.ant-pro-setting-drawer-handle, .ant-pro-setting-drawer')),
    hasSseLeak: text.includes('SSE 收件箱事件') || text.includes('SSE inbox events'),
    scrollWidth: document.documentElement.scrollWidth,
    text: text.slice(0, 800),
  };
})()
`,
    );

    if (
      !isRecord(noticesMobileState) ||
      typeof noticesMobileState.scrollWidth !== 'number' ||
      typeof noticesMobileState.clientWidth !== 'number'
    ) {
      throw new Error(
        `Admin notices mobile layout state is invalid: ${JSON.stringify(noticesMobileState)}`,
      );
    }

    if (noticesMobileState.hasMobileCardList !== true) {
      throw new Error(
        `Admin notices page did not render the mobile card list: ${JSON.stringify(noticesMobileState)}`,
      );
    }

    if (noticesMobileState.hasDesktopTable === true) {
      throw new Error(
        `Admin notices mobile layout rendered the desktop table: ${JSON.stringify(noticesMobileState)}`,
      );
    }

    if (noticesMobileState.hasSettingDrawerTrigger === true) {
      throw new Error(
        `Admin notices mobile layout exposed the development SettingDrawer: ${JSON.stringify(noticesMobileState)}`,
      );
    }

    if (noticesMobileState.scrollWidth > noticesMobileState.clientWidth + 2) {
      throw new Error(
        `Admin notices page has document-level horizontal overflow: ${JSON.stringify(noticesMobileState)}`,
      );
    }

    if (
      noticesMobileState.hasMoreActions !== true &&
      noticesMobileState.hasEmptyState !== true
    ) {
      throw new Error(
        `Admin notices page exposed neither empty state nor collapsed row actions: ${JSON.stringify(noticesMobileState)}`,
      );
    }

    if (noticesMobileState.hasSseLeak === true) {
      throw new Error(
        `Admin notices page leaked technical SSE copy: ${JSON.stringify(noticesMobileState)}`,
      );
    }

    await evaluate(
      page,
      `
(() => {
  const button = Array.from(document.querySelectorAll('button')).find((node) => node.textContent?.includes('新建'));
  if (!(button instanceof HTMLButtonElement)) {
    return false;
  }
  button.click();
  return true;
})()
`,
    );
    await waitForExpression(
      page,
      `document.body.innerText.includes('新建系统通知') && document.body.innerText.includes('选择模板') && Boolean(document.querySelector('[data-opencore-notice-create-template-panel="true"]'))`,
      'Admin notices create modal template selector',
    );
    const noticeCreateTemplateState = await evaluate(
      page,
      `
(() => {
  const panel = document.querySelector('[data-opencore-notice-create-template-panel="true"]');
  const text = document.body.innerText;
  return {
    hasPanel: Boolean(panel),
    hasApplyAction: text.includes('预览并应用'),
    hasTemplateSelector: text.includes('选择模板'),
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  };
})()
`,
    );

    if (
      !isRecord(noticeCreateTemplateState) ||
      noticeCreateTemplateState.hasPanel !== true ||
      noticeCreateTemplateState.hasTemplateSelector !== true ||
      noticeCreateTemplateState.hasApplyAction !== true
    ) {
      throw new Error(
        `Admin notices create modal template selector is missing: ${JSON.stringify(noticeCreateTemplateState)}`,
      );
    }

    if (
      typeof noticeCreateTemplateState.scrollWidth === 'number' &&
      typeof noticeCreateTemplateState.clientWidth === 'number' &&
      noticeCreateTemplateState.scrollWidth >
        noticeCreateTemplateState.clientWidth + 2
    ) {
      throw new Error(
        `Admin notices create modal has document-level horizontal overflow: ${JSON.stringify(noticeCreateTemplateState)}`,
      );
    }

    await evaluate(
      page,
      `
(() => {
  const button = Array.from(document.querySelectorAll('button')).find((node) => node.textContent?.includes('取消'));
  if (button instanceof HTMLButtonElement) {
    button.click();
  }
  return true;
})()
`,
    );

    await page.send('Emulation.setDeviceMetricsOverride', {
      deviceScaleFactor: 1,
      height: 900,
      mobile: false,
      screenHeight: 900,
      screenWidth: 1280,
      width: 1280,
    });
    await page.send('Page.navigate', {
      url: `${adminBaseUrl}/system/area?admin-area-ui-smoke=${runId}`,
    });
    await waitForExpression(
      page,
      'document.readyState === "complete"',
      'Admin area page load',
    );
    await waitForExpression(
      page,
      `['地区管理', '通用地区选择器', '虚拟化地区树表格'].every((label) => document.body.innerText.includes(label))`,
      'Admin area tree surface',
    );
    const areaTreeState = await evaluate(
      page,
      `
(() => {
  const text = document.body.innerText;
  return {
    hasCascader: text.includes('通用地区选择器'),
    hasImportPermission: text.includes('system:area:import'),
    hasManagePermission: text.includes('system:area:manage'),
    hasReadPermission: text.includes('system:area:read'),
    hasRawKeys: text.includes('pages.system.area') || text.includes('tool.area') || text.includes('Area Data'),
    hasTreeTable: text.includes('虚拟化地区树表格'),
    text: text.slice(0, 1000),
  };
})()
`,
    );

    if (
      !isRecord(areaTreeState) ||
      areaTreeState.hasCascader !== true ||
      areaTreeState.hasTreeTable !== true ||
      areaTreeState.hasReadPermission !== true ||
      areaTreeState.hasImportPermission !== true ||
      areaTreeState.hasManagePermission !== true
    ) {
      throw new Error(
        `Admin area tree page is missing required live controls or permissions: ${JSON.stringify(areaTreeState)}`,
      );
    }

    if (areaTreeState.hasRawKeys === true) {
      throw new Error(
        `Admin area page displayed raw i18n or retired tool keys: ${JSON.stringify(areaTreeState)}`,
      );
    }

    await evaluate(
      page,
      `
(() => {
  const tab = Array.from(document.querySelectorAll('[role="tab"], button, div')).find((node) => node.textContent?.trim() === 'IP 查询');
  if (!(tab instanceof HTMLElement)) {
    return false;
  }
  tab.click();
  return true;
})()
`,
    );
    await waitForExpression(
      page,
      `document.body.innerText.includes('IP 边界查询') && document.body.innerText.includes('查询 IP 边界')`,
      'Admin area IP lookup tab',
    );
    await evaluate(
      page,
      `
(() => {
  const tab = Array.from(document.querySelectorAll('[role="tab"], button, div')).find((node) => node.textContent?.trim() === '数据集治理');
  if (!(tab instanceof HTMLElement)) {
    return false;
  }
  tab.click();
  return true;
})()
`,
    );
    await waitForExpression(
      page,
      `document.body.innerText.includes('地区数据集版本')`,
      'Admin area dataset governance tab',
    );
    await evaluate(
      page,
      `
(() => {
  const tab = Array.from(document.querySelectorAll('[role="tab"], button, div')).find((node) => node.textContent?.trim() === '数据导入');
  if (!(tab instanceof HTMLElement)) {
    return false;
  }
  tab.click();
  return true;
})()
`,
    );
    await waitForExpression(
      page,
      `document.body.innerText.includes('地区数据集导入') && document.body.innerText.includes('校验地区导入')`,
      'Admin area dataset import tab',
    );

    await page.send('Emulation.setDeviceMetricsOverride', {
      deviceScaleFactor: 1,
      height: 844,
      mobile: true,
      screenHeight: 844,
      screenWidth: 390,
      width: 390,
    });
    await page.send('Page.navigate', {
      url: `${adminBaseUrl}/system/area?admin-area-mobile-smoke=${runId}`,
    });
    await waitForExpression(
      page,
      'document.readyState === "complete"',
      'Admin area mobile page load',
    );
    await waitForExpression(
      page,
      `document.body.innerText.includes('地区管理') && document.body.innerText.includes('通用地区选择器')`,
      'Admin area mobile text',
    );
    const areaMobileState = await evaluate(
      page,
      `
(() => {
  const text = document.body.innerText;
  return {
    clientWidth: document.documentElement.clientWidth,
    hasRawKeys: text.includes('pages.system.area') || text.includes('tool.area'),
    hasTitle: text.includes('地区管理'),
    scrollWidth: document.documentElement.scrollWidth,
    text: text.slice(0, 1000),
  };
})()
`,
    );

    if (
      !isRecord(areaMobileState) ||
      typeof areaMobileState.scrollWidth !== 'number' ||
      typeof areaMobileState.clientWidth !== 'number' ||
      areaMobileState.hasTitle !== true
    ) {
      throw new Error(
        `Admin area mobile page state is invalid: ${JSON.stringify(areaMobileState)}`,
      );
    }

    if (areaMobileState.scrollWidth > areaMobileState.clientWidth + 2) {
      throw new Error(
        `Admin area mobile page has document-level horizontal overflow: ${JSON.stringify(areaMobileState)}`,
      );
    }

    if (areaMobileState.hasRawKeys === true) {
      throw new Error(
        `Admin area mobile page displayed raw i18n or retired tool keys: ${JSON.stringify(areaMobileState)}`,
      );
    }

    await page.send('Emulation.setDeviceMetricsOverride', {
      deviceScaleFactor: 1,
      height: 900,
      mobile: false,
      screenHeight: 900,
      screenWidth: 1280,
      width: 1280,
    });
    await page.send('Page.navigate', {
      url: `${adminBaseUrl}/personal/profile?admin-profile-ui-smoke=${runId}`,
    });
    await waitForExpression(
      page,
      'document.readyState === "complete"',
      'Admin profile page load',
    );
    await waitForExpression(
      page,
      `['基本资料', '安全设置', '账号绑定', '登录活动'].every((label) => document.body.innerText.includes(label))`,
      'Admin profile center tabs',
    );
    await evaluate(
      page,
      `
(() => {
  const tab = Array.from(document.querySelectorAll('[role="tab"], button, div')).find((node) => node.textContent?.trim() === '账号绑定');
  if (!(tab instanceof HTMLElement)) {
    return false;
  }
  tab.click();
  return true;
})()
`,
    );
    await waitForExpression(
      page,
      `document.body.innerText.includes('待配置') || document.body.innerText.includes('可绑定')`,
      'Admin profile OAuth binding status',
    );
    const bindingScrollPane = await evaluate(
      page,
      `
(() => {
  const pane = document.querySelector('[data-opencore-profile-scroll-pane="account-binding"]');
  if (!(pane instanceof HTMLElement)) {
    return { ok: false, reason: 'missing account binding scroll pane' };
  }
  const style = window.getComputedStyle(pane);
  return {
    ok: style.overflowY === 'auto' && style.overflowX === 'hidden' && style.overscrollBehavior.includes('contain'),
    overflowX: style.overflowX,
    overflowY: style.overflowY,
    overscrollBehavior: style.overscrollBehavior,
    maxHeight: style.maxHeight,
  };
})()
`,
    );

    if (!isRecord(bindingScrollPane) || bindingScrollPane.ok !== true) {
      throw new Error(
        `Admin profile account binding scroll pane is not configured correctly: ${JSON.stringify(bindingScrollPane)}`,
      );
    }

    const oauthBindingState = await evaluate(
      page,
      `
(() => {
  const button = Array.from(document.querySelectorAll('button')).find((node) => node.textContent?.includes('绑定') && node.textContent?.includes('GitHub'));
  if (!(button instanceof HTMLButtonElement)) {
    return { ok: false, reason: 'missing GitHub binding button', text: document.body.innerText.slice(0, 500) };
  }
  const text = document.body.innerText;
  return {
    ok: true,
    buttonDisabled: button.disabled,
    ready: text.includes('可绑定'),
    requiresConfiguration: text.includes('待配置'),
  };
})()
`,
    );

    if (!isRecord(oauthBindingState) || oauthBindingState.ok !== true) {
      throw new Error(
        `Admin profile GitHub binding state is not visible: ${JSON.stringify(oauthBindingState)}`,
      );
    }

    if (oauthBindingState.ready === true) {
      if (oauthBindingState.buttonDisabled === true) {
        throw new Error(
          'Admin profile GitHub binding is ready but the binding button is disabled.',
        );
      }
    } else if (oauthBindingState.requiresConfiguration === true) {
      await evaluate(
        page,
        `
(() => {
  const button = Array.from(document.querySelectorAll('button')).find((node) => node.textContent?.includes('绑定') && node.textContent?.includes('GitHub'));
  if (!(button instanceof HTMLButtonElement)) {
    return false;
  }
  button.click();
  return true;
})()
`,
      );
      await waitForExpression(
        page,
        `document.body.innerText.includes('账号绑定尚未配置完成')`,
        'Admin profile OAuth not-ready modal',
      );
      await evaluate(
        page,
        `
(() => {
  const close = Array.from(document.querySelectorAll('button')).find((node) => node.textContent?.includes('我知道了'));
  if (close instanceof HTMLButtonElement) {
    close.click();
  }
  return true;
})()
`,
      );
    } else {
      throw new Error(
        `Admin profile GitHub binding has neither ready nor requires-configuration status: ${JSON.stringify(oauthBindingState)}`,
      );
    }
    await evaluate(
      page,
      `
(() => {
  const tab = Array.from(document.querySelectorAll('[role="tab"], button, div')).find((node) => node.textContent?.trim() === '登录活动');
  if (!(tab instanceof HTMLElement)) {
    return false;
  }
  tab.click();
  return true;
})()
`,
    );
    const activityScrollPane = await evaluate(
      page,
      `
(() => {
  const pane = document.querySelector('[data-opencore-profile-scroll-pane="login-activity"]');
  if (!(pane instanceof HTMLElement)) {
    return { ok: false, reason: 'missing login activity scroll pane' };
  }
  const style = window.getComputedStyle(pane);
  return {
    ok: style.overflowY === 'auto' && style.overflowX === 'hidden' && style.overscrollBehavior.includes('contain'),
    overflowX: style.overflowX,
    overflowY: style.overflowY,
    overscrollBehavior: style.overscrollBehavior,
    maxHeight: style.maxHeight,
  };
})()
`,
    );

    if (!isRecord(activityScrollPane) || activityScrollPane.ok !== true) {
      throw new Error(
        `Admin profile login activity scroll pane is not configured correctly: ${JSON.stringify(activityScrollPane)}`,
      );
    }

    const profileText = String(await evaluate(page, 'document.body.innerText'));
    for (const forbidden of ['system.users', 'system.roles', 'Provider']) {
      if (profileText.includes(forbidden)) {
        throw new Error(
          `Admin profile page displayed forbidden text ${JSON.stringify(
            forbidden,
          )}.`,
        );
      }
    }

    const usersNetworkStart = networkEntries.length;
    await page.send('Page.navigate', {
      url: `${adminBaseUrl}/system/users?admin-users-ui-smoke=${runId}`,
    });
    await waitForExpression(
      page,
      'document.readyState === "complete"',
      'Admin users page load',
    );
    await waitForCondition(
      () =>
        networkEntries
          .slice(usersNetworkStart)
          .some(
            (entry) =>
              entry.status === 200 &&
              /\/api\/core\/users(?:\?|$)/u.test(entry.url),
          ),
      'Admin users live list request',
    );
    await waitForExpression(
      page,
      `document.body.innerText.includes('用户') && document.body.innerText.includes('用户名') && document.body.innerText.includes('显示名称')`,
      'Admin users page Chinese table surface',
    );
    await waitForExpression(
      page,
      `Boolean(document.querySelector('[data-opencore-system-users-live-table="true"]'))`,
      'Admin users live table marker',
    );
    const usersPageState = await evaluate(
      page,
      `
(() => {
  const text = document.body.innerText;
  return {
    hasAdminUser: text.includes('admin'),
    hasExport: text.includes('下载 Excel'),
    hasImport: text.includes('导入用户'),
    hasPicker: Boolean(document.querySelector('[data-opencore-user-picker-button="true"]')),
    hasRawKeys: text.includes('pages.system.users') || text.includes('system.users'),
    hasTableMarker: Boolean(document.querySelector('[data-opencore-system-users-live-table="true"]')),
    text: text.slice(0, 1000),
  };
})()
`,
    );

    if (
      !isRecord(usersPageState) ||
      usersPageState.hasTableMarker !== true ||
      usersPageState.hasPicker !== true ||
      usersPageState.hasImport !== true ||
      usersPageState.hasExport !== true ||
      usersPageState.hasAdminUser !== true
    ) {
      throw new Error(
        `Admin users page is missing live productized controls: ${JSON.stringify(usersPageState)}`,
      );
    }

    if (usersPageState.hasRawKeys === true) {
      throw new Error(
        `Admin users page displayed raw i18n keys: ${JSON.stringify(usersPageState)}`,
      );
    }

    await evaluate(
      page,
      `
(() => {
  const button = document.querySelector('[data-opencore-user-picker-button="true"]');
  if (!(button instanceof HTMLButtonElement)) {
    return false;
  }
  button.click();
  return true;
})()
`,
    );
    await waitForExpression(
      page,
      `Boolean(document.querySelector('[data-opencore-user-picker-modal="true"]')) && document.body.innerText.includes('按部门筛选')`,
      'Admin users picker modal',
    );
    await evaluate(
      page,
      `
(() => {
  const button = Array.from(document.querySelectorAll('button')).find((node) => node.textContent?.includes('取消'));
  if (button instanceof HTMLButtonElement) {
    button.click();
  }
  return true;
})()
`,
    );
    await evaluate(
      page,
      `
(() => {
  const button = Array.from(document.querySelectorAll('button')).find((node) => node.textContent?.includes('导入用户'));
  if (!(button instanceof HTMLButtonElement)) {
    return false;
  }
  button.click();
  return true;
})()
`,
    );
    await waitForExpression(
      page,
      `Boolean(document.querySelector('[data-opencore-system-users-import-modal="true"]')) && Boolean(document.querySelector('[data-opencore-system-users-import-preview="true"]')) && document.body.innerText.includes('选择 CSV/XLSX 文件')`,
      'Admin users import preview modal',
    );
    await evaluate(
      page,
      `
(() => {
  const button = Array.from(document.querySelectorAll('button')).find((node) => node.textContent?.includes('取消'));
  if (button instanceof HTMLButtonElement) {
    button.click();
  }
  return true;
})()
`,
    );

    const usersMobileNetworkStart = networkEntries.length;
    await page.send('Emulation.setDeviceMetricsOverride', {
      deviceScaleFactor: 1,
      height: 844,
      mobile: true,
      screenHeight: 844,
      screenWidth: 390,
      width: 390,
    });
    await page.send('Page.navigate', {
      url: `${adminBaseUrl}/system/users?admin-users-mobile-smoke=${runId}`,
    });
    await waitForExpression(
      page,
      'document.readyState === "complete"',
      'Admin users mobile page load',
    );
    await waitForCondition(
      () =>
        networkEntries
          .slice(usersMobileNetworkStart)
          .some(
            (entry) =>
              entry.status === 200 &&
              /\/api\/core\/users(?:\?|$)/u.test(entry.url),
          ),
      'Admin users mobile live list request',
    );
    await waitForExpression(
      page,
      `Boolean(document.querySelector('[data-opencore-system-users-mobile-list="true"]'))`,
      'Admin users mobile card list marker',
    );
    await waitForExpression(
      page,
      `document.body.innerText.includes('admin') || document.body.innerText.includes('当前筛选条件下没有用户。')`,
      'Admin users mobile live rows settled',
    );
    const usersMobileState = await evaluate(
      page,
      `
(() => {
  const text = document.body.innerText;
  return {
    clientWidth: document.documentElement.clientWidth,
    hasAdminUser: text.includes('admin'),
    hasDesktopTable: Boolean(document.querySelector('[data-opencore-system-users-live-table="true"]')),
    hasImport: text.includes('导入用户'),
    hasMobileList: Boolean(document.querySelector('[data-opencore-system-users-mobile-list="true"]')),
    hasPicker: Boolean(document.querySelector('[data-opencore-user-picker-button="true"]')),
    hasRawKeys: text.includes('pages.system.users') || text.includes('system.users'),
    scrollWidth: document.documentElement.scrollWidth,
    text: text.slice(0, 1000),
  };
})()
`,
    );

    if (
      !isRecord(usersMobileState) ||
      typeof usersMobileState.scrollWidth !== 'number' ||
      typeof usersMobileState.clientWidth !== 'number'
    ) {
      throw new Error(
        `Admin users mobile layout state is invalid: ${JSON.stringify(usersMobileState)}`,
      );
    }

    if (
      usersMobileState.hasMobileList !== true ||
      usersMobileState.hasAdminUser !== true ||
      usersMobileState.hasPicker !== true ||
      usersMobileState.hasImport !== true
    ) {
      throw new Error(
        `Admin users mobile page is missing live controls: ${JSON.stringify(usersMobileState)}`,
      );
    }

    if (usersMobileState.hasDesktopTable === true) {
      throw new Error(
        `Admin users mobile layout rendered the desktop table: ${JSON.stringify(usersMobileState)}`,
      );
    }

    if (usersMobileState.hasRawKeys === true) {
      throw new Error(
        `Admin users mobile page displayed raw i18n keys: ${JSON.stringify(usersMobileState)}`,
      );
    }

    if (usersMobileState.scrollWidth > usersMobileState.clientWidth + 2) {
      throw new Error(
        `Admin users mobile page has document-level horizontal overflow: ${JSON.stringify(usersMobileState)}`,
      );
    }

    console.log(
      JSON.stringify({
        status: 'pass',
        baseUrl: adminBaseUrl,
        checks: [
          'admin.public-login.error-localized',
          'admin.public-login.error-code-message',
          'admin.public-login.no-duplicate-api-prefix',
          'admin.public-notice-bell.i18n-menu',
          'admin.public-notice-bell.view-all',
          'admin.public-notices.mobile-card-list',
          'admin.public-notices.create-template-selector',
          'admin.public-notices.no-desktop-table-on-mobile',
          'admin.public-notices.no-setting-drawer-trigger',
          'admin.public-notices.mobile-no-page-overflow',
          'admin.public-notices.empty-safe-or-collapsed-actions',
          'admin.public-notices.no-sse-copy-leak',
          'admin.public-area.authenticated-access',
          'admin.public-area.tree-cascader',
          'admin.public-area.ip-tab',
          'admin.public-area.dataset-governance-tab',
          'admin.public-area.import-tab',
          'admin.public-area.mobile-no-page-overflow',
          'admin.public-area.no-raw-keys',
          'admin.public-profile.authenticated-access',
          'admin.public-profile.zh-cn-tabs',
          'admin.public-profile.single-scroll-pane',
          'admin.public-profile.oauth-state-aware',
          'admin.public-profile.no-raw-keys',
          'admin.public-users.live-list-request',
          'admin.public-users.zh-cn-table',
          'admin.public-users.live-table-marker',
          'admin.public-users.no-raw-keys',
          'admin.public-users.user-picker',
          'admin.public-users.import-preview',
          'admin.public-users.mobile-card-list',
          'admin.public-users.no-desktop-table-on-mobile',
          'admin.public-users.mobile-no-page-overflow',
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
      return assertString(body.accessToken, 'Admin UI smoke accessToken');
    }
  }

  throw new Error(
    `Unable to authenticate Admin UI smoke user ${adminUsername}; last status ${lastStatus}.`,
  );
}

function createSubmitScript(username: string, password: string): string {
  return `
(() => {
  const username = document.querySelector('input[name="username"], input#username, input[placeholder="用户名"], input[placeholder="Username"]');
  const password = document.querySelector('input[name="password"], input#password, input[type="password"]');
  const submit = Array.from(document.querySelectorAll('button')).find((button) => button.type === 'submit' || /登\\s*录|Login/i.test(button.innerText));

  if (!(username instanceof HTMLInputElement)) {
    return { ok: false, reason: 'missing username input', text: document.body.innerText.slice(0, 500) };
  }

  if (!(password instanceof HTMLInputElement)) {
    return { ok: false, reason: 'missing password input', text: document.body.innerText.slice(0, 500) };
  }

  if (!(submit instanceof HTMLButtonElement)) {
    return { ok: false, reason: 'missing submit button', text: document.body.innerText.slice(0, 500) };
  }

  const setInputValue = (input, value) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };

  setInputValue(username, ${JSON.stringify(username)});
  setInputValue(password, ${JSON.stringify(password)});
  submit.click();
  return { ok: true };
})()
`;
}

async function launchChrome(): Promise<ChromeInstance> {
  const executable = findChromeExecutable();
  const profileDir = mkdtempSync(join(tmpdir(), 'opencore-admin-ui-smoke-'));
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
    'Chrome or Chromium is required for Admin UI smoke. Set OPENCORE_SMOKE_CHROME_BIN.',
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
