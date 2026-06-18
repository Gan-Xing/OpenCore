import {
  assertArray,
  assertAtLeast,
  assertEqual,
  assertOpenApiPath,
  assertString,
  createTypedSmokeRuntime,
  formatBody,
} from './runtime';

const smoke = createTypedSmokeRuntime();
const { apiPrefix, baseUrl, checkDocs, clients, request } = smoke;
const runId = `${Date.now()}`;

async function main() {
  let token: string | undefined;
  let originalProfile:
    | {
        displayName?: string;
        email?: string;
        gender?: string;
        mobile?: string;
      }
    | undefined;
  let checks: string[] = [];

  try {
    await request('/health/live', { expected: [200] });
    await request('/health/ready', { expected: [200] });

    if (checkDocs) {
      const openApi = await request(`${apiPrefix}/docs-json`, {
        expected: [200],
      });
      for (const path of [
        '/api/core/users/profile',
        '/api/core/users/profile/activity',
        '/api/core/users/profile/sessions/kick-out-others',
        '/api/integrations/oauth/profile/accounts',
        '/api/integrations/oauth/profile/providers',
        '/api/integrations/oauth/profile/flows',
        '/api/integrations/oauth/profile/accounts/{id}/unbind',
      ]) {
        assertOpenApiPath(openApi, path);
      }
    }

    const loginResponse = await smoke.login();
    token = assertString(loginResponse.accessToken, 'login accessToken');
    smoke.setToken(token);

    const profile = await clients.rbac.getUserProfile(token);
    originalProfile = {
      displayName: profile.displayName,
      email: profile.email,
      gender: profile.gender,
      mobile: profile.mobile,
    };
    assertString(profile.id, 'profile id');
    assertString(profile.username, 'profile username');
    assertString(profile.createdAt, 'profile createdAt');
    assertString(profile.updatedAt, 'profile updatedAt');
    assertArray(profile.roleNames, 'profile roleNames');
    assertArray(profile.postNames, 'profile postNames');
    if (profile.deptId) {
      assertString(profile.deptName, 'profile deptName');
    }

    const updatedDisplayName = `OpenCore Profile Smoke ${runId}`;
    const updatedEmail = `profile-smoke-${runId}@opencore.local`;
    const updatedMobile = `+1555${runId.slice(-7).padStart(7, '0')}`;
    const updatedProfile = await clients.rbac.updateUserProfile(token, {
      displayName: updatedDisplayName,
      email: updatedEmail,
      gender: 'unknown',
      mobile: updatedMobile,
    });
    assertEqual(
      updatedProfile.displayName,
      updatedDisplayName,
      'updated profile displayName',
    );
    assertEqual(updatedProfile.email, updatedEmail, 'updated profile email');
    assertEqual(updatedProfile.mobile, updatedMobile, 'updated profile mobile');
    assertEqual(updatedProfile.gender, 'unknown', 'updated profile gender');

    const refreshedProfile = await clients.rbac.getUserProfile(token);
    assertEqual(
      refreshedProfile.displayName,
      updatedDisplayName,
      'refreshed profile displayName',
    );
    assertEqual(
      refreshedProfile.email,
      updatedEmail,
      'refreshed profile email',
    );
    checks = [
      ...checks,
      'core.profile.fields.read',
      'core.profile.fields.update',
      'core.profile.fields.refresh',
    ];

    const activity = await clients.rbac.getUserProfileActivity(token);
    assertString(activity.currentTokenId, 'profile activity currentTokenId');
    assertArray(activity.sessions, 'profile activity sessions');
    assertAtLeast(activity.sessions.length, 1, 'profile activity sessions');
    if (!activity.sessions.some((session) => session.current)) {
      throw new Error('Expected profile activity to include current session');
    }
    assertArray(activity.loginLogs, 'profile activity loginLogs');
    assertAtLeast(activity.loginLogs.length, 1, 'profile activity loginLogs');
    checks = [...checks, 'core.profile.activity.read'];

    const secondLogin = await smoke.login();
    const secondToken = assertString(
      secondLogin.accessToken,
      'second login accessToken',
    );
    const kickResult =
      await clients.rbac.kickOutOtherUserProfileSessions(token);
    assertAtLeast(kickResult.requested, 1, 'profile kick requested');
    assertAtLeast(kickResult.kicked, 1, 'profile kick kicked');
    await request(`${apiPrefix}/core/users/profile`, {
      expected: [401, 403],
      token: secondToken,
    });
    checks = [...checks, 'core.profile.sessions.kick-out-others'];

    const providers =
      await clients.integration.listProfileOAuthProviders(token);
    assertArray(providers, 'profile OAuth providers');
    assertAtLeast(providers.length, 1, 'profile OAuth provider count');
    const provider = providers[0];
    assertString(provider.code, 'profile OAuth provider code');
    assertString(provider.name, 'profile OAuth provider name');
    assertEqual(provider.type, 'oauth', 'profile OAuth provider type');
    assertString(provider.bindingStatus, 'profile OAuth bindingStatus');
    const providerPayload = JSON.stringify(providers);
    if (
      providerPayload.includes('secretRef') ||
      providerPayload.includes('clientId') ||
      providerPayload.includes('clientSecret') ||
      providerPayload.includes('authorizationUrl') ||
      providerPayload.includes('tokenUrl') ||
      providerPayload.includes('configVersion')
    ) {
      throw new Error(
        `Profile OAuth providers must not expose sensitive config fields: ${formatBody(
          providers,
        )}`,
      );
    }

    const accounts = await clients.integration.listProfileOAuthAccounts(token);
    const accountPayload = JSON.stringify(accounts);
    if (
      accountPayload.includes('accessTokenRef') ||
      accountPayload.includes('refreshTokenRef') ||
      accountPayload.includes('secret')
    ) {
      throw new Error(
        `Profile OAuth account must not expose token refs: ${formatBody(
          accounts,
        )}`,
      );
    }

    checks = [...checks, 'core.profile.oauth.providers'];

    const readyProvider = providers.find(
      (item) => item.bindingStatus === 'ready',
    );
    if (readyProvider) {
      const flow = await clients.integration.startProfileOAuthFlow(token, {
        providerCode: readyProvider.code,
      });
      assertEqual(flow.subjectType, 'user', 'profile OAuth flow subjectType');
      assertEqual(flow.subjectId, profile.id, 'profile OAuth flow subjectId');
      assertEqual(flow.status, 'pending', 'profile OAuth flow status');
      assertEqual(
        new URL(flow.authorizationUrl, baseUrl).searchParams.get('state'),
        flow.state,
        'profile OAuth authorization state',
      );

      const callback = await clients.integration.callbackOAuthProvider(
        readyProvider.code,
        {
          state: flow.state,
          code: `profile-smoke-code-${runId}`,
          providerAccountId: `profile-smoke-${runId}`,
          scopes: 'read:user',
        },
      );
      assertEqual(callback.status, 'accepted', 'profile OAuth callback status');

      const refreshedAccounts =
        await clients.integration.listProfileOAuthAccounts(token);
      const account = refreshedAccounts.find(
        (item) => item.tokenId === callback.token?.id,
      );
      if (!account) {
        throw new Error(
          'Expected profile OAuth account list to include callback token',
        );
      }
      assertEqual(account.status, 'active', 'profile OAuth account status');

      const unbound = await clients.integration.unbindProfileOAuthAccount(
        token,
        account.tokenId,
        { reason: 'Profile center smoke unbind.' },
      );
      assertEqual(unbound.status, 'revoked', 'profile OAuth unbind status');
      checks = [
        ...checks,
        'core.profile.oauth.flow',
        'core.profile.oauth.accounts',
        'core.profile.oauth.unbind',
      ];
    } else {
      const response = await request<Record<string, unknown>>(
        `${apiPrefix}/integrations/oauth/profile/flows`,
        {
          body: { providerCode: provider.code },
          expected: [400],
          method: 'POST',
          token,
        },
      );
      assertEqual(
        readApiErrorCode(response),
        'INTEGRATION_OAUTH_PROFILE_PROVIDER_NOT_READY',
        'profile OAuth not-ready error code',
      );
      checks = [
        ...checks,
        'core.profile.oauth.accounts',
        'core.profile.oauth.not-ready-guard',
      ];
    }

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
  } finally {
    if (token && originalProfile) {
      await clients.rbac.updateUserProfile(token, {
        displayName: originalProfile.displayName,
        email: originalProfile.email ?? null,
        gender: originalProfile.gender ?? null,
        mobile: originalProfile.mobile ?? null,
      });
    }
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

function readApiErrorCode(response: Record<string, unknown>): unknown {
  if (typeof response.code === 'string') {
    return response.code;
  }

  const error = response.error;
  if (
    error &&
    typeof error === 'object' &&
    !Array.isArray(error) &&
    typeof (error as { code?: unknown }).code === 'string'
  ) {
    return (error as { code: string }).code;
  }
}
