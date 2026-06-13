#!/usr/bin/env node

import { createHmac } from 'node:crypto';
import net from 'node:net';

const DEFAULT_PORT = '39173';

const port = process.env.OPENCORE_SMOKE_PORT || DEFAULT_PORT;
const baseUrl = trimTrailingSlash(
  process.env.OPENCORE_SMOKE_BASE_URL || `http://127.0.0.1:${port}`,
);
const apiPrefix = normalizeApiPrefix(
  process.env.OPENCORE_SMOKE_API_PREFIX || '/api',
);
const checkDocs = parseBoolean(process.env.OPENCORE_SMOKE_CHECK_DOCS, true);
const username = process.env.OPENCORE_SMOKE_ADMIN_USERNAME || 'admin';
const passwordCandidates = [
  process.env.OPENCORE_SMOKE_ADMIN_PASSWORD,
  process.env.BOOTSTRAP_ADMIN_PASSWORD,
  'admin123',
].filter((candidate, index, candidates) => {
  return Boolean(candidate) && candidates.indexOf(candidate) === index;
});
const timeoutMs = Number(process.env.OPENCORE_SMOKE_TIMEOUT_MS || 10000);

const runId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const noticeTitles = [
  `OpenCore Smoke Notice ${runId}`,
  `OpenCore Smoke Notice Mark All ${runId}`,
];
const templateCode = `smoke.template.${runId}`;
let token;
let smtpServer;
const createdNoticeIds = [];
const createdTemplateCodes = [];

class HttpStatusError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'HttpStatusError';
    this.status = status;
  }
}

try {
  await request('/health/live', { expected: [200] });
  await request('/health/ready', { expected: [200] });

  if (checkDocs) {
    await request(`${apiPrefix}/docs-json`, { expected: [200] });
  }

  await request(`${apiPrefix}/core/notices/inbox`, { expected: [401] });

  const loginResponse = await login();
  token = assertString(loginResponse.accessToken, 'login accessToken');

  await apiRequest('/core/notices/templates/simple-list', {
    expected: [200],
  }).then((templates) => {
    assertArray(templates, 'notice template simple-list');
    assertItemsContainCode(
      templates,
      'release.window',
      'notice template simple-list',
    );
  });
  await apiRequest('/core/notices/templates/release.window/render', {
    method: 'POST',
    body: {
      templateParams: {
        owner: 'Ops',
        version: '2026.6',
        window: '02:00 UTC',
      },
    },
  }).then((preview) => {
    assertEqual(
      preview.title,
      'Release window: 2026.6',
      'seed notice template rendered title',
    );
    assertEqual(
      preview.content,
      'Version 2026.6 is scheduled for 02:00 UTC. Owner: Ops.',
      'seed notice template rendered content',
    );
  });
  await apiRequest('/core/notices/templates/release.window/render', {
    method: 'POST',
    expected: [400],
    body: {
      templateParams: {
        owner: 'Ops',
        version: '2026.6',
      },
    },
  });
  await apiRequest('/core/notices/templates/release.window/render', {
    method: 'POST',
    expected: [400],
    body: {
      templateParams: {
        extra: 'blocked',
        owner: 'Ops',
        version: '2026.6',
        window: '02:00 UTC',
      },
    },
  });
  await apiRequest('/core/notices/templates', {
    method: 'POST',
    expected: [400],
    body: {
      code: `${templateCode}.bad`,
      name: 'Invalid Notice Template Boolean',
      type: 'maintenance',
      titleTemplate: 'Invalid {{service}}',
      contentTemplate: 'Invalid {{service}}',
      enabled: 'not-boolean',
    },
  });

  const smokeTemplate = await apiRequest('/core/notices/templates', {
    method: 'POST',
    body: {
      code: templateCode,
      name: 'OpenCore Smoke Notice Template',
      type: 'maintenance',
      titleTemplate: 'Smoke maintenance {{service}}',
      contentTemplate: '{{service}} window {{time}} by {{owner}}.',
      enabled: true,
      remark: `Created by notice smoke ${runId}`,
    },
  });
  createdTemplateCodes.push(templateCode);
  assertEqual(smokeTemplate.code, templateCode, 'created template code');
  assertArrayIncludes(
    smokeTemplate.params,
    'service',
    'created template params',
  );
  assertArrayIncludes(smokeTemplate.params, 'time', 'created template params');
  assertArrayIncludes(smokeTemplate.params, 'owner', 'created template params');
  assertPageItemsContainCode(
    await apiRequest('/core/notices/templates?type=maintenance&enabled=true'),
    templateCode,
    'notice template list',
  );

  const smokeTemplatePreview = await apiRequest(
    `/core/notices/templates/${encodeURIComponent(templateCode)}/render`,
    {
      method: 'POST',
      body: {
        templateParams: {
          owner: 'Ops',
          service: 'API',
          time: '09:00 UTC',
        },
      },
    },
  );
  assertEqual(
    smokeTemplatePreview.title,
    'Smoke maintenance API',
    'created template rendered title',
  );
  assertEqual(
    smokeTemplatePreview.content,
    'API window 09:00 UTC by Ops.',
    'created template rendered content',
  );
  await apiRequest(
    `/core/notices/templates/${encodeURIComponent(templateCode)}/create-notice`,
    {
      method: 'POST',
      expected: [400],
      body: {
        audience: 'admin',
        createdBy: username,
        pinned: 'not-boolean',
        templateParams: {
          owner: 'Ops',
          service: 'API',
          time: '09:00 UTC',
        },
      },
    },
  );

  const templateNotice = await apiRequest(
    `/core/notices/templates/${encodeURIComponent(templateCode)}/create-notice`,
    {
      method: 'POST',
      body: {
        audience: 'admin',
        createdBy: username,
        pinned: true,
        templateParams: {
          owner: 'Ops',
          service: 'API',
          time: '09:00 UTC',
        },
      },
    },
  );
  createdNoticeIds.push(assertString(templateNotice.id, 'template notice id'));
  assertEqual(
    templateNotice.title,
    'Smoke maintenance API',
    'template notice title',
  );
  assertEqual(templateNotice.status, 'draft', 'template notice status');
  assertEqual(templateNotice.pinned, true, 'template notice pinned');

  const disabledTemplate = await apiRequest(
    `/core/notices/templates/${encodeURIComponent(templateCode)}`,
    {
      method: 'PATCH',
      body: { enabled: false },
    },
  );
  assertEqual(disabledTemplate.enabled, false, 'disabled template state');
  await apiRequest(
    `/core/notices/templates/${encodeURIComponent(templateCode)}/render`,
    {
      method: 'POST',
      expected: [400],
      body: {
        templateParams: {
          owner: 'Ops',
          service: 'API',
          time: '09:00 UTC',
        },
      },
    },
  );
  await apiRequest(
    `/core/notices/templates/${encodeURIComponent(templateCode)}`,
    {
      method: 'DELETE',
    },
  );
  createdTemplateCodes.pop();

  await apiRequest('/core/notices/inbox?readStatus=not-boolean', {
    expected: [400],
  });
  await apiRequest('/core/notices/inbox/read', {
    method: 'POST',
    expected: [400],
    body: { ids: [] },
  });
  await apiRequest('/core/notices/inbox/read', {
    method: 'POST',
    expected: [400],
    body: { ids: ['notice_welcome', 'notice_welcome'] },
  });
  await apiRequest(
    '/core/notices/missing_notice/read-users?page=1&pageSize=10',
    {
      expected: [404],
    },
  );
  await apiRequest(
    '/core/notices/missing_notice/deliveries?page=1&pageSize=10',
    {
      expected: [404],
    },
  );

  const draftNotice = await createNotice(noticeTitles[0]);
  await apiRequest(
    `/core/notices/inbox/${encodeURIComponent(draftNotice.id)}`,
    {
      expected: [404],
    },
  );
  await apiRequest('/core/notices/inbox/read', {
    method: 'POST',
    expected: [404],
    body: { ids: [draftNotice.id] },
  });
  await apiRequest(
    `/core/notices/${encodeURIComponent(draftNotice.id)}/dispatch`,
    {
      method: 'POST',
      expected: [400],
    },
  );
  await apiRequest(
    `/core/notices/${encodeURIComponent(draftNotice.id)}/deliveries?readStatus=not-boolean`,
    {
      expected: [400],
    },
  );
  await apiRequest(
    `/core/notices/${encodeURIComponent(draftNotice.id)}/deliveries?channel=email`,
    {
      expected: [400],
    },
  );
  await apiRequest(
    `/core/notices/${encodeURIComponent(draftNotice.id)}/deliveries?providerStatus=unknown`,
    {
      expected: [400],
    },
  );

  const publishedNotice = await apiRequest(
    `/core/notices/${encodeURIComponent(draftNotice.id)}/publish`,
    {
      method: 'PATCH',
    },
  );
  assertEqual(publishedNotice.status, 'published', 'published notice status');
  const deliveryPage = await apiRequest(
    `/core/notices/${encodeURIComponent(draftNotice.id)}/deliveries?channel=in_app&providerStatus=pending&readStatus=false&username=${encodeURIComponent(username)}`,
  );
  assertPageItemsContainDelivery(
    deliveryPage,
    username,
    'delivered',
    false,
    'pending',
    'published notice delivery records',
  );
  const dispatchResult = await apiRequest(
    `/core/notices/${encodeURIComponent(draftNotice.id)}/dispatch`,
    {
      method: 'POST',
    },
  );
  assertEqual(dispatchResult.deliveredCount, 0, 'repeat dispatch new count');
  assertNumberAtLeast(
    dispatchResult.skippedCount,
    1,
    'repeat dispatch skipped count',
  );
  assertNumberAtLeast(
    dispatchResult.pendingCount,
    1,
    'repeat dispatch pending provider count',
  );

  const executeResult = await apiRequest(
    `/core/notices/${encodeURIComponent(draftNotice.id)}/deliveries/execute`,
    {
      method: 'POST',
    },
  );
  assertEqual(executeResult.provider, 'in_app.local', 'execute provider');
  assertNumberAtLeast(
    executeResult.attemptedCount,
    1,
    'execute attempted count',
  );
  assertNumberAtLeast(executeResult.sentCount, 1, 'execute sent count');
  assertEqual(executeResult.pendingCount, 0, 'execute pending count');

  const sentDeliveryPage = await apiRequest(
    `/core/notices/${encodeURIComponent(draftNotice.id)}/deliveries?channel=in_app&providerStatus=sent&username=${encodeURIComponent(username)}`,
  );
  assertPageItemsContainDelivery(
    sentDeliveryPage,
    username,
    'delivered',
    false,
    'sent',
    'sent notice delivery provider records',
  );
  const repeatExecuteResult = await apiRequest(
    `/core/notices/${encodeURIComponent(draftNotice.id)}/deliveries/execute`,
    {
      method: 'POST',
    },
  );
  assertEqual(
    repeatExecuteResult.attemptedCount,
    0,
    'repeat execute attempted count',
  );

  await apiRequest('/integrations/providers/mail.sandbox/disable', {
    method: 'PATCH',
  });
  const mailDispatchResult = await apiRequest(
    `/core/notices/${encodeURIComponent(draftNotice.id)}/dispatch`,
    {
      method: 'POST',
      body: { channel: 'mail' },
    },
  );
  assertEqual(mailDispatchResult.channel, 'mail', 'mail dispatch channel');
  assertEqual(
    mailDispatchResult.provider,
    'mail.sandbox',
    'mail dispatch provider',
  );
  assertNumberAtLeast(
    mailDispatchResult.deliveredCount,
    1,
    'mail dispatch new count',
  );
  assertNumberAtLeast(
    mailDispatchResult.pendingCount,
    1,
    'mail dispatch pending count',
  );
  await apiRequest(
    `/core/notices/${encodeURIComponent(draftNotice.id)}/deliveries/execute`,
    {
      method: 'POST',
      expected: [400],
      body: { channel: 'mail' },
    },
  );
  await apiRequest('/integrations/providers/mail.sandbox/enable', {
    method: 'PATCH',
  });
  const mailExecuteResult = await apiRequest(
    `/core/notices/${encodeURIComponent(draftNotice.id)}/deliveries/execute`,
    {
      method: 'POST',
      body: { channel: 'mail' },
    },
  );
  assertEqual(
    mailExecuteResult.provider,
    'mail.sandbox',
    'mail execute provider',
  );
  assertNumberAtLeast(
    mailExecuteResult.queuedOutboxCount,
    1,
    'mail queued outbox count',
  );
  assertEqual(mailExecuteResult.sentCount, 0, 'mail execute sent count');
  assertNumberAtLeast(
    mailExecuteResult.pendingCount,
    1,
    'mail execute pending count',
  );
  const mailDeliveryPage = await apiRequest(
    `/core/notices/${encodeURIComponent(draftNotice.id)}/deliveries?channel=mail&providerStatus=pending&username=${encodeURIComponent(username)}`,
  );
  const mailDelivery = assertPageItemsContainDelivery(
    mailDeliveryPage,
    username,
    'delivered',
    false,
    'pending',
    'mail queued notice delivery provider records',
    { channel: 'mail', provider: 'mail.sandbox' },
  );
  assertString(mailDelivery.recipient, 'mail delivery recipient');
  assertString(
    mailDelivery.providerMessageId,
    'mail delivery provider message id',
  );
  const mailOutboxPage = await apiRequest(
    '/integrations/mail/outbox?status=queued&providerCode=mail.sandbox',
  );
  const noticeMailOutbox = assertOutboxContainsNotice(
    mailOutboxPage,
    draftNotice.id,
    mailDelivery.providerMessageId,
    'mail notice integration outbox',
  );
  assertEqual(
    noticeMailOutbox.subject,
    draftNotice.title,
    'mail notice integration outbox subject',
  );
  const repeatMailExecuteResult = await apiRequest(
    `/core/notices/${encodeURIComponent(draftNotice.id)}/deliveries/execute`,
    {
      method: 'POST',
      body: { channel: 'mail' },
    },
  );
  assertEqual(
    repeatMailExecuteResult.attemptedCount,
    0,
    'repeat mail execute attempted count',
  );
  await apiRequest(
    `/integrations/mail/outbox/${encodeURIComponent(mailDelivery.providerMessageId)}/failed`,
    {
      method: 'PATCH',
      expected: [400],
      body: { error: ' ' },
    },
  );
  const failedMailOutbox = await apiRequest(
    `/integrations/mail/outbox/${encodeURIComponent(mailDelivery.providerMessageId)}/failed`,
    {
      method: 'PATCH',
      body: { error: 'Sandbox SMTP rejected the notice' },
    },
  );
  assertEqual(failedMailOutbox.status, 'failed', 'mail outbox failed status');
  assertEqual(failedMailOutbox.retryCount, 1, 'mail outbox retry count');
  assertEqual(
    failedMailOutbox.error,
    'Sandbox SMTP rejected the notice',
    'mail outbox error',
  );
  const failedMailDeliveryPage = await apiRequest(
    `/core/notices/${encodeURIComponent(draftNotice.id)}/deliveries?channel=mail&providerStatus=failed&username=${encodeURIComponent(username)}`,
  );
  assertPageItemsContainDelivery(
    failedMailDeliveryPage,
    username,
    'delivered',
    false,
    'failed',
    'mail failed notice delivery provider records',
    { channel: 'mail', provider: 'mail.sandbox' },
  );
  const retriedMailOutbox = await apiRequest(
    `/integrations/mail/outbox/${encodeURIComponent(mailDelivery.providerMessageId)}/retry`,
    { method: 'PATCH' },
  );
  assertEqual(retriedMailOutbox.status, 'queued', 'mail outbox retry status');
  assertEqual(retriedMailOutbox.error, undefined, 'mail outbox retry error');
  const retriedMailDeliveryPage = await apiRequest(
    `/core/notices/${encodeURIComponent(draftNotice.id)}/deliveries?channel=mail&providerStatus=pending&username=${encodeURIComponent(username)}`,
  );
  assertPageItemsContainDelivery(
    retriedMailDeliveryPage,
    username,
    'delivered',
    false,
    'pending',
    'mail retried notice delivery provider records',
    { channel: 'mail', provider: 'mail.sandbox' },
  );
  await apiRequest('/integrations/mail/outbox/callback', {
    method: 'POST',
    expected: [400],
    body: {
      providerCode: 'mail.sandbox',
      messageId: mailDelivery.providerMessageId,
      status: 'sent',
      signature: '0'.repeat(64),
    },
  });
  await apiRequest('/integrations/mail/outbox/callback', {
    method: 'POST',
    expected: [400],
    body: {
      providerCode: 'mail.sandbox',
      messageId: mailDelivery.providerMessageId,
      status: 'failed',
      error: ' ',
      signature: signOutboxCallback({
        channel: 'mail',
        providerCode: 'mail.sandbox',
        messageId: mailDelivery.providerMessageId,
        status: 'failed',
        error: '',
      }),
    },
  });
  await apiRequest('/integrations/mail/outbox/callback', {
    method: 'POST',
    expected: [400],
    body: {
      providerCode: 'sms.sandbox',
      messageId: mailDelivery.providerMessageId,
      status: 'sent',
      signature: signOutboxCallback({
        channel: 'mail',
        providerCode: 'sms.sandbox',
        messageId: mailDelivery.providerMessageId,
        status: 'sent',
      }),
    },
  });
  const callbackMailOutbox = await apiRequest(
    '/integrations/mail/outbox/callback',
    {
      method: 'POST',
      body: {
        providerCode: 'mail.sandbox',
        messageId: mailDelivery.providerMessageId,
        status: 'sent',
        signature: signOutboxCallback({
          channel: 'mail',
          providerCode: 'mail.sandbox',
          messageId: mailDelivery.providerMessageId,
          status: 'sent',
        }),
      },
    },
  );
  assertEqual(callbackMailOutbox.status, 'sent', 'mail callback sent status');
  const sentMailOutbox = await apiRequest(
    `/integrations/mail/outbox/${encodeURIComponent(mailDelivery.providerMessageId)}`,
  );
  assertEqual(sentMailOutbox.status, 'sent', 'mail outbox sent status');
  assertString(sentMailOutbox.sentAt, 'mail outbox sentAt');
  const sentMailDeliveryPage = await apiRequest(
    `/core/notices/${encodeURIComponent(draftNotice.id)}/deliveries?channel=mail&providerStatus=sent&username=${encodeURIComponent(username)}`,
  );
  assertPageItemsContainDelivery(
    sentMailDeliveryPage,
    username,
    'delivered',
    false,
    'sent',
    'mail sent notice delivery provider records',
    { channel: 'mail', provider: 'mail.sandbox' },
  );

  smtpServer = await startSmokeSmtpServer({
    password: 'opencore-local-smtp-password',
    username: 'smtp-user',
  });
  const smtpProviderCode = 'mail.smtp.smoke';
  await upsertIntegrationProvider(smtpProviderCode, {
    type: 'mail',
    name: 'Mail SMTP Smoke',
    enabled: true,
    secretRef: 'secret://config/integration.mail.smtp.password.secret',
    config: {
      adapter: 'smtp',
      authMethod: 'PLAIN',
      from: 'no-reply@opencore.test',
      host: '127.0.0.1',
      port: smtpServer.port,
      requireTls: false,
      secure: false,
      timeoutMs: 5000,
      username: 'smtp-user',
    },
  });
  await apiRequest(
    `/integrations/providers/${encodeURIComponent(smtpProviderCode)}/health-check`,
    {
      method: 'POST',
    },
  ).then((provider) => {
    assertEqual(provider.healthStatus, 'healthy', 'Mail SMTP provider health');
  });
  const smtpOutbox = await apiRequest('/integrations/mail/outbox', {
    method: 'POST',
    body: {
      providerCode: smtpProviderCode,
      recipient: 'admin@example.test',
      subject: `SMTP smoke subject ${runId}`,
      payload: {
        body: `SMTP smoke body ${runId}`,
      },
    },
  });
  assertEqual(smtpOutbox.status, 'queued', 'Mail SMTP outbox queued status');
  assertEqual(
    smtpOutbox.subject,
    `SMTP smoke subject ${runId}`,
    'Mail SMTP outbox subject',
  );
  const smtpProcess = await apiRequest('/integrations/mail/outbox/process', {
    method: 'POST',
    body: {
      providerCode: smtpProviderCode,
      limit: 100,
    },
  });
  assertNumberAtLeast(
    smtpProcess.attemptedCount,
    1,
    'Mail SMTP process attempted count',
  );
  assertNumberAtLeast(smtpProcess.sentCount, 1, 'Mail SMTP process sent count');
  assertEqual(smtpProcess.failedCount, 0, 'Mail SMTP process failed count');
  const sentSmtpOutbox = await apiRequest(
    `/integrations/mail/outbox/${encodeURIComponent(smtpOutbox.id)}`,
  );
  assertEqual(sentSmtpOutbox.status, 'sent', 'Mail SMTP outbox sent status');
  assertEqual(
    sentSmtpOutbox.subject,
    `SMTP smoke subject ${runId}`,
    'Mail SMTP sent outbox subject',
  );
  assertStringIncludes(
    smtpServer.messages.join('\n'),
    `SMTP smoke subject ${runId}`,
    'Mail SMTP received subject',
  );
  assertStringIncludes(
    smtpServer.messages.join('\n'),
    `SMTP smoke body ${runId}`,
    'Mail SMTP received body',
  );
  await smtpServer.close();
  smtpServer = undefined;

  await apiRequest('/integrations/providers/sms.sandbox/enable', {
    method: 'PATCH',
  });
  const smsDispatchResult = await apiRequest(
    `/core/notices/${encodeURIComponent(draftNotice.id)}/dispatch`,
    {
      method: 'POST',
      body: { channel: 'sms' },
    },
  );
  assertEqual(smsDispatchResult.channel, 'sms', 'SMS dispatch channel');
  assertEqual(
    smsDispatchResult.provider,
    'sms.sandbox',
    'SMS dispatch provider',
  );
  const smsExecuteResult = await apiRequest(
    `/core/notices/${encodeURIComponent(draftNotice.id)}/deliveries/execute`,
    {
      method: 'POST',
      body: { channel: 'sms' },
    },
  );
  assertNumberAtLeast(
    smsExecuteResult.queuedOutboxCount,
    1,
    'SMS queued outbox count',
  );
  assertEqual(smsExecuteResult.sentCount, 0, 'SMS execute sent count');
  const smsDeliveryPage = await apiRequest(
    `/core/notices/${encodeURIComponent(draftNotice.id)}/deliveries?channel=sms&providerStatus=pending&username=${encodeURIComponent(username)}`,
  );
  const smsDelivery = assertPageItemsContainDelivery(
    smsDeliveryPage,
    username,
    'delivered',
    false,
    'pending',
    'SMS queued notice delivery provider records',
    { channel: 'sms', provider: 'sms.sandbox' },
  );
  assertString(
    smsDelivery.providerMessageId,
    'SMS delivery provider message id',
  );
  const smsOutboxPage = await apiRequest(
    '/integrations/sms/outbox?status=queued&providerCode=sms.sandbox',
  );
  assertOutboxContainsNotice(
    smsOutboxPage,
    draftNotice.id,
    smsDelivery.providerMessageId,
    'SMS notice integration outbox',
  );
  await apiRequest('/integrations/outbox/schedule/run', {
    method: 'POST',
    expected: [400],
    body: { channels: ['push'] },
  });
  await apiRequest('/integrations/outbox/schedule/run', {
    method: 'POST',
    expected: [400],
    body: { channels: ['sms'], providerCode: 'mail.sandbox' },
  });
  const failedSmsOutbox = await apiRequest(
    `/integrations/sms/outbox/${encodeURIComponent(smsDelivery.providerMessageId)}/failed`,
    {
      method: 'PATCH',
      body: { error: 'Sandbox SMS gateway throttled' },
    },
  );
  assertEqual(failedSmsOutbox.status, 'failed', 'SMS outbox failed status');
  assertEqual(failedSmsOutbox.retryCount, 1, 'SMS outbox retry count');
  const cappedSmsSchedule = await apiRequest(
    '/integrations/outbox/schedule/run',
    {
      method: 'POST',
      body: {
        channels: ['sms'],
        providerCode: 'sms.sandbox',
        maxRetryCount: 1,
      },
    },
  );
  assertEqual(cappedSmsSchedule.retriedCount, 0, 'SMS capped schedule retries');
  assertEqual(
    cappedSmsSchedule.attemptedCount,
    0,
    'SMS capped schedule attempted count',
  );
  const processedSmsOutbox = await apiRequest(
    '/integrations/outbox/schedule/run',
    {
      method: 'POST',
      body: {
        channels: ['sms'],
        providerCode: 'sms.sandbox',
        retryFailed: true,
        maxRetryCount: 3,
        limit: 100,
      },
    },
  );
  assertNumberAtLeast(
    processedSmsOutbox.retriedCount,
    1,
    'SMS schedule retried count',
  );
  assertNumberAtLeast(
    processedSmsOutbox.attemptedCount,
    1,
    'SMS schedule attempted count',
  );
  assertNumberAtLeast(
    processedSmsOutbox.sentCount,
    1,
    'SMS schedule sent count',
  );
  assertEqual(processedSmsOutbox.failedCount, 0, 'SMS schedule failed count');
  const sentSmsOutbox = await apiRequest(
    `/integrations/sms/outbox/${encodeURIComponent(smsDelivery.providerMessageId)}`,
  );
  assertEqual(sentSmsOutbox.status, 'sent', 'SMS outbox sent status');
  const sentSmsDeliveryPage = await apiRequest(
    `/core/notices/${encodeURIComponent(draftNotice.id)}/deliveries?channel=sms&providerStatus=sent&username=${encodeURIComponent(username)}`,
  );
  assertPageItemsContainDelivery(
    sentSmsDeliveryPage,
    username,
    'delivered',
    false,
    'sent',
    'SMS sent notice delivery provider records',
    { channel: 'sms', provider: 'sms.sandbox' },
  );
  await apiRequest(
    `/integrations/sms/outbox/${encodeURIComponent(smsDelivery.providerMessageId)}/failed`,
    {
      method: 'PATCH',
      expected: [400],
      body: { error: 'too late' },
    },
  );

  const smsHttpProviderCode = 'sms.http.smoke';
  const smsHttpEndpoint = `${baseUrl}/health/live`;
  const smsHttpHost = new URL(smsHttpEndpoint).host;
  await upsertIntegrationProvider(smsHttpProviderCode, {
    type: 'sms',
    name: 'SMS HTTP Smoke',
    enabled: true,
    secretRef: 'secret://integration/sms/http-smoke',
    config: {
      adapter: 'http',
      endpoint: smsHttpEndpoint,
      allowedHosts: [smsHttpHost],
      method: 'GET',
      successStatus: 200,
      timeoutMs: 5000,
    },
  });
  await apiRequest(
    `/integrations/providers/${encodeURIComponent(smsHttpProviderCode)}/health-check`,
    {
      method: 'POST',
    },
  ).then((provider) => {
    assertEqual(provider.healthStatus, 'healthy', 'SMS HTTP provider health');
  });
  const smsHttpOutbox = await apiRequest('/integrations/sms/outbox', {
    method: 'POST',
    body: {
      providerCode: smsHttpProviderCode,
      templateCode: 'sms.otp',
      recipient: '+15559876543',
      payload: { code: '872341' },
    },
  });
  assertEqual(smsHttpOutbox.status, 'queued', 'SMS HTTP outbox queued status');
  const smsHttpProcess = await apiRequest('/integrations/sms/outbox/process', {
    method: 'POST',
    body: {
      providerCode: smsHttpProviderCode,
      limit: 100,
    },
  });
  assertNumberAtLeast(
    smsHttpProcess.attemptedCount,
    1,
    'SMS HTTP process attempted count',
  );
  assertNumberAtLeast(
    smsHttpProcess.sentCount,
    1,
    'SMS HTTP process sent count',
  );
  assertEqual(smsHttpProcess.failedCount, 0, 'SMS HTTP process failed count');
  const sentSmsHttpOutbox = await apiRequest(
    `/integrations/sms/outbox/${encodeURIComponent(smsHttpOutbox.id)}`,
  );
  assertEqual(sentSmsHttpOutbox.status, 'sent', 'SMS HTTP outbox sent status');

  const inboxItem = await apiRequest(
    `/core/notices/inbox/${encodeURIComponent(draftNotice.id)}`,
  );
  assertEqual(inboxItem.id, draftNotice.id, 'inbox item id');
  assertEqual(inboxItem.read, false, 'new inbox item read state');
  assertEqual(inboxItem.readAt, undefined, 'new inbox item readAt');

  const unreadPage = await apiRequest('/core/notices/inbox?readStatus=false');
  assertPageItemsContain(unreadPage, draftNotice.id, 'unread inbox page');
  const unreadList = await apiRequest(
    '/core/notices/inbox/unread-list?limit=10',
  );
  assertArray(unreadList, 'unread notice list');
  assertItemsContain(unreadList, draftNotice.id, 'unread notice list');
  const unreadCount = await apiRequest('/core/notices/inbox/unread-count');
  assertNumberAtLeast(unreadCount.unreadCount, 1, 'unread count');

  await apiRequest('/core/notices/inbox/read', {
    method: 'POST',
    expected: [404],
    body: { ids: [draftNotice.id, `missing_${draftNotice.id}`] },
  });

  const readResult = await apiRequest('/core/notices/inbox/read', {
    method: 'POST',
    body: { ids: [draftNotice.id] },
  });
  assertEqual(readResult.markedReadCount, 1, 'first read mutation count');
  assertArrayIncludes(readResult.ids, draftNotice.id, 'first read mutation id');

  const rereadResult = await apiRequest('/core/notices/inbox/read', {
    method: 'POST',
    body: { ids: [draftNotice.id] },
  });
  assertEqual(rereadResult.markedReadCount, 0, 'repeat read mutation count');

  const readItem = await apiRequest(
    `/core/notices/inbox/${encodeURIComponent(draftNotice.id)}`,
  );
  assertEqual(readItem.read, true, 'read inbox item state');
  assertString(readItem.readAt, 'read inbox item readAt');
  const readPage = await apiRequest('/core/notices/inbox?readStatus=true');
  assertPageItemsContain(readPage, draftNotice.id, 'read inbox page');
  const readDeliveryPage = await apiRequest(
    `/core/notices/${encodeURIComponent(draftNotice.id)}/deliveries?readStatus=true&username=${encodeURIComponent(username)}`,
  );
  assertPageItemsContainDelivery(
    readDeliveryPage,
    username,
    'read',
    true,
    'sent',
    'read notice delivery records',
  );
  const readUsersPage = await apiRequest(
    `/core/notices/${encodeURIComponent(draftNotice.id)}/read-users?page=1&pageSize=10`,
  );
  assertPageItemsContainUsername(
    readUsersPage,
    username,
    'notice read users page',
  );
  assertItemsExclude(
    await apiRequest('/core/notices/inbox/unread-list?limit=10'),
    draftNotice.id,
    'unread list after mark read',
  );

  const markAllNotice = await createNotice(noticeTitles[1]);
  await apiRequest(
    `/core/notices/${encodeURIComponent(markAllNotice.id)}/publish`,
    {
      method: 'PATCH',
    },
  );
  assertEqual(
    (
      await apiRequest(
        `/core/notices/inbox/${encodeURIComponent(markAllNotice.id)}`,
      )
    ).read,
    false,
    'mark-all setup read state',
  );
  const markAllResult = await apiRequest('/core/notices/inbox/read-all', {
    method: 'POST',
  });
  assertArrayIncludes(
    markAllResult.ids,
    markAllNotice.id,
    'mark-all mutation ids',
  );
  assertEqual(markAllResult.unreadCount, 0, 'mark-all unread count');

  await cleanupCreatedTemplates();
  await cleanupCreatedNotices();

  console.log(
    JSON.stringify({
      status: 'pass',
      baseUrl,
      apiPrefix,
      checks: [
        'health.live',
        'health.ready',
        ...(checkDocs ? ['openapi.docs-json'] : []),
        'core.notice.inbox.auth-required',
        'auth.login',
        'core.notice.template.simple-list',
        'core.notice.template.render',
        'core.notice.template.missing-param-guard',
        'core.notice.template.extra-param-guard',
        'core.notice.template.enabled-deserialization-guard',
        'core.notice.template.create',
        'core.notice.template.list-filter',
        'core.notice.template.render-created',
        'core.notice.template.pinned-deserialization-guard',
        'core.notice.template.create-notice',
        'core.notice.template.update',
        'core.notice.template.disabled-render-guard',
        'core.notice.template.delete',
        'core.notice.inbox.bad-read-status-guard',
        'core.notice.inbox.empty-read-ids-guard',
        'core.notice.inbox.duplicate-read-ids-guard',
        'core.notice.read-users.missing-guard',
        'core.notice.deliveries.missing-guard',
        'core.notice.inbox.draft-hidden',
        'core.notice.inbox.mark-draft-hidden-guard',
        'core.notice.deliveries.dispatch-draft-guard',
        'core.notice.deliveries.bad-read-status-guard',
        'core.notice.deliveries.bad-channel-guard',
        'core.notice.deliveries.bad-provider-status-guard',
        'core.notice.publish',
        'core.notice.deliveries.unread-records',
        'core.notice.deliveries.dispatch-idempotent',
        'core.notice.deliveries.provider-execute',
        'core.notice.deliveries.provider-sent-records',
        'core.notice.deliveries.provider-execute-idempotent',
        'core.notice.deliveries.mail-outbox-provider',
        'core.notice.deliveries.mail-outbox-subject',
        'core.notice.deliveries.mail-smtp-adapter',
        'core.notice.deliveries.mail-smtp-subject',
        'core.notice.deliveries.outbox-failed-retry-sent-sync',
        'core.notice.deliveries.outbox-callback-signature',
        'core.notice.deliveries.outbox-schedule-retry',
        'core.notice.deliveries.sms-outbox-provider',
        'core.notice.deliveries.sms-http-adapter',
        'core.notice.inbox.unread-item',
        'core.notice.inbox.unread-page',
        'core.notice.inbox.unread-list',
        'core.notice.inbox.unread-count',
        'core.notice.inbox.missing-read-id-guard',
        'core.notice.inbox.mark-read',
        'core.notice.inbox.repeat-read-idempotent',
        'core.notice.inbox.read-page',
        'core.notice.deliveries.read-records',
        'core.notice.read-users.list',
        'core.notice.inbox.unread-list-after-read',
        'core.notice.inbox.mark-all-read',
        'core.notice.cleanup',
      ],
    }),
  );
} catch (error) {
  await smtpServer?.close().catch(() => undefined);
  await cleanupCreatedTemplates().catch(() => undefined);
  await cleanupCreatedNotices().catch(() => undefined);
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

async function createNotice(title) {
  const notice = await apiRequest('/core/notices', {
    method: 'POST',
    body: {
      title,
      content: `Smoke notice content for ${runId}`,
      type: 'announcement',
      audience: 'admin',
      createdBy: username,
    },
  });
  createdNoticeIds.push(assertString(notice.id, 'created notice id'));
  assertEqual(notice.status, 'draft', 'created notice status');
  return notice;
}

async function cleanupCreatedNotices() {
  while (createdNoticeIds.length > 0) {
    const id = createdNoticeIds.pop();
    await apiRequest(`/core/notices/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      expected: [200, 404],
    }).catch(() => undefined);
  }
}

async function cleanupCreatedTemplates() {
  while (createdTemplateCodes.length > 0) {
    const code = createdTemplateCodes.pop();
    await apiRequest(`/core/notices/templates/${encodeURIComponent(code)}`, {
      method: 'DELETE',
      expected: [200, 404],
    }).catch(() => undefined);
  }
}

async function login() {
  let lastError;

  for (const password of passwordCandidates) {
    try {
      return await request(`${apiPrefix}/auth/login`, {
        method: 'POST',
        expected: [200, 201],
        body: {
          username,
          password,
        },
      });
    } catch (error) {
      lastError = error;
      if (
        !(error instanceof HttpStatusError) ||
        ![401, 403].includes(error.status)
      ) {
        throw error;
      }
    }
  }

  throw new Error(
    `Unable to authenticate smoke admin ${username}. Set OPENCORE_SMOKE_ADMIN_PASSWORD to the deployed admin password.`,
    { cause: lastError },
  );
}

async function apiRequest(path, options = {}) {
  return request(`${apiPrefix}${path}`, {
    ...options,
    token,
  });
}

async function upsertIntegrationProvider(code, body) {
  try {
    await apiRequest(`/integrations/providers/${encodeURIComponent(code)}`);
    return apiRequest(`/integrations/providers/${encodeURIComponent(code)}`, {
      method: 'PATCH',
      body: {
        name: body.name,
        enabled: body.enabled,
        secretRef: body.secretRef,
        config: body.config,
      },
    });
  } catch (error) {
    if (error instanceof HttpStatusError && error.status === 404) {
      return apiRequest('/integrations/providers', {
        method: 'POST',
        body: {
          code,
          ...body,
        },
      });
    }

    throw error;
  }
}

async function startSmokeSmtpServer({ password, username }) {
  const messages = [];
  const server = net.createServer((socket) => {
    socket.setEncoding('utf8');
    let buffer = '';
    let dataMode = false;
    let dataLines = [];
    let authenticated = false;

    const write = (line) => socket.write(`${line}\r\n`);
    write('220 opencore-smoke ESMTP');

    socket.on('data', (chunk) => {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? '';

      for (const rawLine of lines) {
        const line = rawLine.replace(/\r$/, '');
        if (dataMode) {
          if (line === '.') {
            messages.push(dataLines.join('\n'));
            dataLines = [];
            dataMode = false;
            write('250 queued');
          } else {
            dataLines.push(line.startsWith('..') ? line.slice(1) : line);
          }
          continue;
        }

        const upper = line.toUpperCase();
        if (upper.startsWith('EHLO') || upper.startsWith('HELO')) {
          write('250-opencore-smoke');
          write('250 AUTH PLAIN LOGIN');
        } else if (upper.startsWith('AUTH PLAIN')) {
          const encoded = line.split(/\s+/)[2] ?? '';
          const decoded = Buffer.from(encoded, 'base64').toString('utf8');
          authenticated = decoded === `\u0000${username}\u0000${password}`;
          write(
            authenticated
              ? '235 authentication successful'
              : '535 authentication failed',
          );
        } else if (upper.startsWith('MAIL FROM')) {
          write(
            authenticated ? '250 sender ok' : '530 authentication required',
          );
        } else if (upper.startsWith('RCPT TO')) {
          write('250 recipient ok');
        } else if (upper === 'DATA') {
          dataMode = true;
          dataLines = [];
          write('354 end with <CR><LF>.<CR><LF>');
        } else if (upper === 'RSET' || upper === 'NOOP') {
          write('250 ok');
        } else if (upper === 'QUIT') {
          write('221 bye');
          socket.end();
        } else {
          write('250 ok');
        }
      }
    });
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Smoke SMTP server address is unavailable');
  }

  return {
    messages,
    port: address.port,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

async function request(pathOrUrl, options = {}) {
  const url = pathOrUrl.startsWith('http')
    ? pathOrUrl
    : `${baseUrl}${pathOrUrl}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        ...(options.body ? { 'content-type': 'application/json' } : {}),
        ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
    const contentType = response.headers.get('content-type') || '';
    const responseBody = contentType.includes('application/json')
      ? await response.json()
      : await response.text();
    const expected = options.expected || [200, 201];

    if (!expected.includes(response.status)) {
      throw new HttpStatusError(
        `${options.method || 'GET'} ${url} returned ${response.status}: ${formatResponseBody(responseBody)}`,
        response.status,
      );
    }

    return responseBody;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`${options.method || 'GET'} ${url} timed out`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function assertPageItemsContain(page, id, label) {
  assertArray(page.items, `${label} items`);
  assertItemsContain(page.items, id, label);
}

function assertPageItemsContainCode(page, code, label) {
  assertArray(page.items, `${label} items`);
  assertItemsContainCode(page.items, code, label);
}

function assertPageItemsContainUsername(page, username, label) {
  assertArray(page.items, `${label} items`);
  const item = page.items.find((candidate) => candidate?.username === username);

  if (!item) {
    throw new Error(`${label} must include username ${username}`);
  }

  assertString(item.readAt, `${label} readAt`);
}

function assertPageItemsContainDelivery(
  page,
  username,
  status,
  expectReadAt,
  providerStatus,
  label,
  expected = { channel: 'in_app', provider: 'in_app.local' },
) {
  assertArray(page.items, `${label} items`);
  const item = page.items.find((candidate) => candidate?.username === username);

  if (!item) {
    throw new Error(`${label} must include username ${username}`);
  }

  assertEqual(item.channel, expected.channel, `${label} channel`);
  assertEqual(item.status, status, `${label} status`);
  assertEqual(item.provider, expected.provider, `${label} provider`);
  assertEqual(item.providerStatus, providerStatus, `${label} provider status`);
  assertString(item.deliveredAt, `${label} deliveredAt`);

  if (providerStatus === 'sent') {
    assertNumberAtLeast(item.attemptCount, 1, `${label} attempt count`);
    assertString(item.lastAttemptAt, `${label} lastAttemptAt`);
    assertString(item.sentAt, `${label} sentAt`);
    assertEqual(item.lastError, undefined, `${label} lastError`);
  } else if (providerStatus === 'failed') {
    assertNumberAtLeast(item.attemptCount, 1, `${label} attempt count`);
    assertString(item.lastAttemptAt, `${label} lastAttemptAt`);
    assertString(item.lastError, `${label} lastError`);
  } else {
    assertEqual(item.sentAt, undefined, `${label} sentAt`);
    assertEqual(item.lastError, undefined, `${label} lastError`);
  }

  if (expectReadAt) {
    assertString(item.readAt, `${label} readAt`);
  } else if (item.readAt !== undefined) {
    throw new Error(`${label} readAt must be empty before read`);
  }

  return item;
}

function assertOutboxContainsNotice(page, noticeId, providerMessageId, label) {
  assertArray(page.items, `${label} items`);
  const item = page.items.find(
    (candidate) =>
      candidate?.id === providerMessageId &&
      candidate?.payload?.noticeId === noticeId,
  );

  if (!item) {
    throw new Error(
      `${label} must include provider message ${providerMessageId} for notice ${noticeId}`,
    );
  }

  assertEqual(item.status, 'queued', `${label} status`);
  assertString(item.preview, `${label} preview`);
  return item;
}

function signOutboxCallback(input) {
  const signingKey =
    input.providerCode === 'sms.sandbox'
      ? 'secret://integration/sms/sandbox'
      : 'secret://integration/mail/sandbox';
  return createHmac('sha256', signingKey)
    .update(
      [
        input.channel,
        input.providerCode,
        input.messageId,
        input.status,
        input.error ?? '',
      ].join('\n'),
    )
    .digest('hex');
}

function assertItemsContain(items, id, label) {
  if (!items.some((item) => item?.id === id)) {
    throw new Error(`${label} must include ${id}`);
  }
}

function assertItemsContainCode(items, code, label) {
  if (!items.some((item) => item?.code === code)) {
    throw new Error(`${label} must include code ${code}`);
  }
}

function assertItemsExclude(items, id, label) {
  if (items.some((item) => item?.id === id)) {
    throw new Error(`${label} must not include ${id}`);
  }
}

function assertArrayIncludes(values, expected, label) {
  assertArray(values, label);
  if (!values.includes(expected)) {
    throw new Error(`${label} must include ${expected}`);
  }
}

function assertArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
}

function assertString(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function assertStringIncludes(value, expected, label) {
  assertString(value, label);
  if (!value.includes(expected)) {
    throw new Error(`${label} must include ${expected}`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, received ${actual}`);
  }
}

function assertNumberAtLeast(value, min, label) {
  if (typeof value !== 'number' || value < min) {
    throw new Error(`${label}: expected at least ${min}, received ${value}`);
  }
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

function normalizeApiPrefix(value) {
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`;
  return trimTrailingSlash(withLeadingSlash);
}

function parseBoolean(value, defaultValue) {
  if (value === undefined || value === '') {
    return defaultValue;
  }

  if (value === 'true' || value === '1') {
    return true;
  }

  if (value === 'false' || value === '0') {
    return false;
  }

  throw new Error(`Invalid boolean value: ${value}`);
}

function formatResponseBody(body) {
  if (typeof body === 'string') {
    return body.slice(0, 500);
  }
  return JSON.stringify(body).slice(0, 500);
}
