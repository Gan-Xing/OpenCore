import {
  assertArray,
  assertAtLeast,
  assertDefined,
  assertEqual,
  assertIncludes,
  assertOpenApiPath,
  assertString,
  createTypedSmokeRuntime,
} from './runtime';

const smoke = createTypedSmokeRuntime();
const { apiPrefix, baseUrl, checkDocs, clients, request } = smoke;
const runId = `${Date.now()}`;

async function main() {
  const checks: string[] = [];

  await request('/health/live', { expected: [200] });
  await request('/health/ready', { expected: [200] });

  if (checkDocs) {
    const openApi = await request(`${apiPrefix}/docs-json`, {
      expected: [200],
    });
    for (const path of [
      '/api/auth/social/providers',
      '/api/auth/social/flows',
      '/api/auth/social/callback/{providerCode}',
      '/api/auth/social/complete',
      '/api/auth/social/bind-login',
    ]) {
      assertOpenApiPath(openApi, path);
    }
  }

  const providers = await clients.rbac.listSocialAuthProviders();
  assertArray(providers, 'social auth providers');
  assertAtLeast(providers.length, 6, 'social auth provider count');
  const github = assertDefined(
    providers.find((provider) => provider.code === 'oauth.github'),
    'GitHub social provider',
  );
  assertEqual(github.status, 'ready', 'GitHub social provider status');
  for (const code of ['oauth.google', 'oauth.microsoft']) {
    const provider = assertDefined(
      providers.find((item) => item.code === code),
      `${code} social provider`,
    );
    if (provider.status === 'ready') {
      const providerFlow = await clients.rbac.startSocialAuthFlow({
        providerCode: code,
      });
      assertEqual(
        providerFlow.providerCode,
        code,
        `${code} social flow provider`,
      );
      assertString(providerFlow.authorizationUrl, `${code} authorizationUrl`);
    } else {
      assertEqual(
        provider.status,
        'requires_configuration',
        `${code} disabled status`,
      );
      assertString(provider.message, `${code} disabled message`);
    }
  }
  for (const code of ['oauth.wechat', 'oauth.alipay', 'oauth.douyin']) {
    const provider = assertDefined(
      providers.find((item) => item.code === code),
      `${code} social provider`,
    );
    assertEqual(
      provider.status,
      'requires_configuration',
      `${code} disabled status`,
    );
    assertString(provider.message, `${code} disabled message`);
  }
  checks.push('auth.social.providers');

  const flow = await clients.rbac.startSocialAuthFlow({
    providerCode: 'oauth.github',
  });
  assertEqual(flow.providerCode, 'oauth.github', 'social flow provider');
  assertString(flow.state, 'social flow state');
  assertString(flow.authorizationUrl, 'social flow authorizationUrl');
  const authorizationUrl = new URL(flow.authorizationUrl);
  assertEqual(
    authorizationUrl.hostname,
    'github.com',
    'social flow GitHub authorization host',
  );
  assertEqual(
    authorizationUrl.searchParams.get('state'),
    flow.state,
    'social flow authorization state',
  );
  const redirectUri = authorizationUrl.searchParams.get('redirect_uri');
  if (!redirectUri?.includes('/api/integrations/oauth/callback/github')) {
    throw new Error(`Unexpected social redirect_uri: ${redirectUri}`);
  }
  if (redirectUri.includes('144.217.243.161')) {
    throw new Error(
      `GitHub social redirect_uri still points at the retired public IP: ${redirectUri}`,
    );
  }
  const expectedRedirectOrigin =
    process.env.OPENCORE_SMOKE_EXPECTED_GITHUB_REDIRECT_ORIGIN?.replace(
      /\/+$/u,
      '',
    );
  if (
    expectedRedirectOrigin &&
    new URL(redirectUri).origin !== expectedRedirectOrigin
  ) {
    throw new Error(
      `GitHub social redirect_uri origin mismatch: expected ${expectedRedirectOrigin}, received ${redirectUri}`,
    );
  }
  checks.push('auth.social.github-flow');

  const providerAccountId = `github:social-smoke-${runId}`;
  const callbackLocation = await followSocialCallback({
    code: `social-smoke-code-${runId}`,
    providerAccountId,
    state: flow.state,
  });
  assertEqual(
    callbackLocation.searchParams.get('socialStatus'),
    'accepted',
    'social callback accepted redirect',
  );
  assertEqual(
    callbackLocation.pathname,
    '/user/social-login',
    'social callback Admin redirect path',
  );
  checks.push('auth.social.github-callback');

  const unbound = await clients.rbac.completeSocialAuthLogin({
    providerCode: 'oauth.github',
    state: flow.state,
  });
  assertEqual(unbound.status, 'requires_binding', 'social unbound status');
  assertEqual(
    unbound.providerAccountId,
    providerAccountId,
    'social unbound provider account',
  );
  checks.push('auth.social.requires-binding');

  const bound = await clients.rbac.bindSocialAuthLogin({
    password: getSmokePassword(),
    providerCode: 'oauth.github',
    state: flow.state,
    username: process.env.OPENCORE_SMOKE_ADMIN_USERNAME || 'admin',
  });
  assertEqual(bound.status, 'authenticated', 'social bind login status');
  const boundToken = assertString(
    bound.session?.accessToken,
    'social bind login accessToken',
  );
  checks.push('auth.social.bind-login');

  const secondFlow = await clients.rbac.startSocialAuthFlow({
    providerCode: 'oauth.github',
  });
  await followSocialCallback({
    code: `social-smoke-code-direct-${runId}`,
    providerAccountId,
    state: secondFlow.state,
  });
  const direct = await clients.rbac.completeSocialAuthLogin({
    providerCode: 'oauth.github',
    state: secondFlow.state,
  });
  assertEqual(direct.status, 'authenticated', 'social direct login status');
  const directToken = assertString(
    direct.session?.accessToken,
    'social direct login accessToken',
  );
  checks.push('auth.social.direct-login');

  const repeatedCallback = await followSocialCallback({
    code: `social-smoke-code-repeat-${runId}`,
    expectedStatus: 'rejected',
    providerAccountId,
    state: secondFlow.state,
  });
  assertEqual(
    repeatedCallback.searchParams.get('socialStatus'),
    'rejected',
    'social repeated callback rejected redirect',
  );
  checks.push('auth.social.repeat-callback-rejected');

  const loginLogs = await clients.system.listLoginLogs(directToken, {
    logType: 'login.social',
    username: process.env.OPENCORE_SMOKE_ADMIN_USERNAME || 'admin',
  });
  assertAtLeast(loginLogs.total, 1, 'social login log total');
  assertIncludes(
    loginLogs.items.map((item) => item.logType),
    'login.social',
    'social login log type',
  );
  checks.push('auth.social.login-log');

  await cleanupBinding(directToken, providerAccountId);
  smoke.setToken(boundToken);

  console.log(
    JSON.stringify(
      {
        baseUrl,
        checks,
        status: 'ok',
      },
      null,
      2,
    ),
  );
}

async function followSocialCallback(input: {
  code: string;
  expectedStatus?: 'accepted' | 'rejected';
  providerAccountId: string;
  state: string;
}): Promise<URL> {
  const url = new URL(
    `${baseUrl}${apiPrefix}/integrations/oauth/callback/github`,
  );
  url.searchParams.set('code', input.code);
  url.searchParams.set('providerAccountId', input.providerAccountId);
  url.searchParams.set('scopes', 'read:user user:email');
  url.searchParams.set('state', input.state);
  const response = await fetch(url, { redirect: 'manual' });
  assertEqual(response.status, 302, 'social callback redirect status');
  const location = assertString(
    response.headers.get('location'),
    'social callback location',
  );
  const parsed = new URL(location);
  if (input.expectedStatus) {
    assertEqual(
      parsed.searchParams.get('socialStatus'),
      input.expectedStatus,
      'social callback expected status',
    );
  }
  return parsed;
}

async function cleanupBinding(token: string, providerAccountId: string) {
  const accounts = await clients.integration.listProfileOAuthAccounts(token);
  const account = accounts.find(
    (item) =>
      item.providerCode === 'oauth.github' &&
      item.providerAccountId === providerAccountId &&
      item.status === 'active',
  );
  if (!account) {
    return;
  }
  await clients.integration.unbindProfileOAuthAccount(token, account.tokenId, {
    reason: 'Social auth smoke cleanup.',
  });
}

function getSmokePassword(): string {
  return (
    process.env.OPENCORE_SMOKE_ADMIN_PASSWORD ||
    process.env.BOOTSTRAP_ADMIN_PASSWORD ||
    'admin123'
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
