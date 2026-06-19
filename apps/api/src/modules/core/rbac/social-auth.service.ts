import { BadRequestException, Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { createApiErrorBody } from '@opencore/common';
import { PrismaService } from '@opencore/database';
import { IntegrationRepository } from '../../integration/integration/integration.repository';
import {
  createOAuthTokenId,
  createOAuthTokenSecretRefs,
  normalizeOAuthProviderCode,
  toOAuthProfileProviderDto,
} from '../../integration/integration/integration.repository';
import type {
  IntegrationProviderRecord,
  OAuthCallbackAuditRecord,
} from '../../integration/integration/integration.seed';
import type { OAuthProviderCallbackDto } from '../../integration/integration/integration.dto';
import { AuthService, type LoginContext } from './auth.service';
import type {
  BindSocialAuthLoginDto,
  CompleteSocialAuthDto,
  SocialAuthFlowDto,
  SocialAuthProviderDto,
  SocialAuthProviderIssue,
  SocialAuthResultDto,
  StartSocialAuthFlowDto,
} from './rbac.dto';

type OAuthTokenRow = {
  id: string;
  providerCode: string;
  subjectType: string;
  subjectId: string;
  providerAccountId: string;
  scopes: unknown;
  accessTokenRef: string;
  refreshTokenRef: string | null;
  status: string;
  expiresAt: Date | null;
  lastRotatedAt: Date | null;
  revokedAt: Date | null;
  revokedBy: string | null;
  revokeReason: string | null;
  createdAt: Date;
};

type OAuthFlowRow = {
  id: string;
  providerCode: string;
  state: string;
  subjectType: string;
  subjectId: string;
  tokenId: string | null;
  status: string;
};

type SocialFlowState = {
  flow: OAuthFlowRow;
  token: OAuthTokenRow;
};

const SOCIAL_LOGIN_SUBJECT_TYPE = 'social-login';
const SUPPORTED_SOCIAL_PROVIDERS = new Set([
  'oauth.github',
  'oauth.google',
  'oauth.microsoft',
]);
const SOCIAL_PROVIDER_META: Record<string, { icon: string; name: string }> = {
  'oauth.alipay': { icon: 'alipay-circle', name: '支付宝' },
  'oauth.douyin': { icon: 'tik-tok', name: '抖音' },
  'oauth.github': { icon: 'github', name: 'GitHub' },
  'oauth.google': { icon: 'google', name: 'Google' },
  'oauth.microsoft': { icon: 'windows', name: 'Microsoft' },
  'oauth.wechat': { icon: 'wechat', name: '微信' },
};

@Injectable()
export class SocialAuthService {
  constructor(
    private readonly authService: AuthService,
    private readonly integration: IntegrationRepository,
    private readonly prisma: PrismaService,
  ) {}

  async listProviders(): Promise<readonly SocialAuthProviderDto[]> {
    const providers = await this.integration.listOAuthProviders({
      page: 1,
      pageSize: 100,
    });

    return providers.items.map((provider) => this.toSocialProvider(provider));
  }

  async startFlow(body: StartSocialAuthFlowDto): Promise<SocialAuthFlowDto> {
    const providerCode = normalizeOAuthProviderCode(body.providerCode);
    const provider =
      await this.integration.getProviderForOAuthExchange(providerCode);
    const socialProvider = this.toSocialProvider(provider);

    if (socialProvider.status !== 'ready') {
      throw socialAuthBadRequest(
        'AUTH_SOCIAL_PROVIDER_NOT_READY',
        'Social login provider is not ready.',
        { issue: socialProvider.issue, providerCode },
      );
    }

    if (!SUPPORTED_SOCIAL_PROVIDERS.has(providerCode)) {
      throw socialAuthBadRequest(
        'AUTH_SOCIAL_PROVIDER_UNSUPPORTED',
        'Social login provider is modeled but not enabled for sign-in.',
        { providerCode },
      );
    }

    const flow = await this.integration.startOAuthFlow({
      providerCode,
      redirectUri: this.resolveProviderCallbackUrl(provider, providerCode),
      subjectId: `social_${randomBytes(12).toString('hex')}`,
      subjectType: SOCIAL_LOGIN_SUBJECT_TYPE,
    });

    return {
      authorizationUrl: flow.authorizationUrl,
      expiresAt: flow.expiresAt,
      providerCode: flow.providerCode,
      state: flow.state,
    };
  }

  async handleCallback(
    providerCodeInput: string,
    query: OAuthProviderCallbackDto,
  ): Promise<string> {
    const providerCode = normalizeOAuthProviderCode(providerCodeInput);
    const callback = await this.buildCallback(providerCode, query);
    const result = await this.integration.callbackOAuthProvider(
      providerCode,
      callback,
    );

    return this.buildSocialLoginRedirectUrl(result);
  }

  async complete(
    body: CompleteSocialAuthDto,
    context: LoginContext,
  ): Promise<SocialAuthResultDto> {
    const state = await this.loadCompletedSocialFlow(body);
    const bindings = await this.findActiveUserBindings(state.token);

    if (bindings.length === 0) {
      return {
        message: '该第三方账号尚未绑定 OpenCore 账号。',
        providerAccountId: state.token.providerAccountId,
        providerCode: state.token.providerCode,
        status: 'requires_binding',
      };
    }

    if (bindings.length > 1) {
      throw socialAuthBadRequest(
        'AUTH_SOCIAL_ACCOUNT_AMBIGUOUS',
        'Social account is bound to multiple users.',
        { providerCode: state.token.providerCode },
      );
    }

    await this.revokeTemporaryToken(state.token.id, 'social login completed');
    const session = await this.authService.createSocialSessionForUser(
      bindings[0].subjectId,
      context,
      {
        providerAccountId: state.token.providerAccountId,
        providerCode: state.token.providerCode,
      },
    );

    return {
      message: '社交登录成功。',
      providerAccountId: state.token.providerAccountId,
      providerCode: state.token.providerCode,
      session,
      status: 'authenticated',
    };
  }

  async bindLogin(
    body: BindSocialAuthLoginDto,
    context: LoginContext,
  ): Promise<SocialAuthResultDto> {
    const state = await this.loadCompletedSocialFlow(body);
    const user = await this.authService.verifyCredentials(
      body.username,
      body.password,
      context,
    );
    const bindings = await this.findActiveUserBindings(state.token);
    const otherBinding = bindings.find(
      (binding) => binding.subjectId !== user.id,
    );

    if (otherBinding) {
      throw socialAuthBadRequest(
        'AUTH_SOCIAL_ACCOUNT_ALREADY_BOUND',
        'Social account is already bound to another OpenCore user.',
        { providerCode: state.token.providerCode },
      );
    }

    await this.bindTokenToUser(state.token, user.id);
    await this.revokeTemporaryToken(state.token.id, 'social login bound');
    const session = await this.authService.createSocialSessionForUser(
      user.id,
      context,
      {
        providerAccountId: state.token.providerAccountId,
        providerCode: state.token.providerCode,
      },
    );

    return {
      message: '社交账号已绑定并登录。',
      providerAccountId: state.token.providerAccountId,
      providerCode: state.token.providerCode,
      session,
      status: 'authenticated',
    };
  }

  private async buildCallback(
    providerCode: string,
    query: OAuthProviderCallbackDto,
  ): Promise<OAuthProviderCallbackDto> {
    if (query.error || query.providerAccountId) {
      return { ...query, state: normalizeRequiredText(query.state, 'state') };
    }

    try {
      const code = normalizeRequiredText(query.code, 'code');
      const exchanged =
        providerCode === 'oauth.github'
          ? await this.exchangeGitHubCode(code, providerCode)
          : await this.exchangeOidcCode(code, providerCode);
      return {
        code: query.code,
        expiresInSeconds: exchanged.expiresInSeconds,
        providerAccountId: exchanged.providerAccountId,
        scopes: exchanged.scopes,
        state: normalizeRequiredText(query.state, 'state'),
      };
    } catch (error) {
      return {
        error: readOAuthExchangeErrorCode(error),
        state: normalizeRequiredText(query.state, 'state'),
      };
    }
  }

  private async exchangeGitHubCode(
    code: string,
    providerCode: string,
  ): Promise<{
    expiresInSeconds: number | null;
    providerAccountId: string;
    scopes: string;
  }> {
    const provider =
      await this.integration.getProviderForOAuthExchange(providerCode);
    const clientId = readConfigString(provider.config.clientId);
    const clientSecret =
      process.env.OPENCORE_GITHUB_OAUTH_CLIENT_SECRET?.trim();
    const tokenUrl = readConfigString(provider.config.tokenUrl);

    if (!clientId || !clientSecret || !tokenUrl) {
      throw new OAuthExchangeError(
        'oauth_exchange_not_configured',
        'GitHub OAuth is not configured.',
      );
    }

    let tokenResponse: Response;
    try {
      tokenResponse = await fetch(tokenUrl, {
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: this.resolveSocialCallbackUrl(providerCode),
        }),
        headers: {
          accept: 'application/json',
          'content-type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
      });
    } catch (error) {
      throw new OAuthExchangeError(
        normalizeOAuthRequestError(error),
        error instanceof Error ? error.message : 'GitHub OAuth request failed.',
      );
    }
    let tokenPayload: {
      access_token?: string;
      error?: string;
      error_description?: string;
      expires_in?: number;
      scope?: string;
    };
    try {
      tokenPayload = (await tokenResponse.json()) as typeof tokenPayload;
    } catch {
      throw new OAuthExchangeError(
        'oauth_exchange_invalid_response',
        'GitHub OAuth token response is not valid JSON.',
      );
    }

    if (!tokenResponse.ok || tokenPayload.error) {
      throw new OAuthExchangeError(
        normalizeOAuthExchangeProviderError(tokenPayload.error),
        tokenPayload.error_description ?? 'GitHub OAuth token exchange failed.',
      );
    }
    if (!tokenPayload.access_token) {
      throw new OAuthExchangeError(
        'oauth_exchange_missing_access_token',
        'GitHub OAuth token response is missing access_token.',
      );
    }

    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${tokenPayload.access_token}`,
        'user-agent': 'OpenCore Admin',
      },
    });
    const userPayload = (await userResponse.json()) as {
      id?: number | string;
    };

    if (!userResponse.ok || userPayload.id === undefined) {
      throw new OAuthExchangeError(
        'oauth_exchange_user_lookup_failed',
        'GitHub OAuth user lookup failed.',
      );
    }

    return {
      expiresInSeconds: normalizeExpiresInSeconds(tokenPayload.expires_in),
      providerAccountId: `github:${userPayload.id}`,
      scopes: tokenPayload.scope || 'read:user user:email',
    };
  }

  private async exchangeOidcCode(
    code: string,
    providerCode: string,
  ): Promise<{
    expiresInSeconds: number | null;
    providerAccountId: string;
    scopes: string;
  }> {
    const provider =
      await this.integration.getProviderForOAuthExchange(providerCode);
    const shortProvider = providerCode.replace(/^oauth\./, '');
    const clientId = readConfigString(provider.config.clientId);
    const clientSecret =
      process.env[
        `OPENCORE_${shortProvider.toUpperCase()}_OAUTH_CLIENT_SECRET`
      ]?.trim();
    const tokenUrl = readConfigString(provider.config.tokenUrl);

    if (!clientId || !clientSecret || !tokenUrl) {
      throw new OAuthExchangeError(
        'oauth_exchange_not_configured',
        `${providerCode} OAuth is not configured.`,
      );
    }

    let tokenResponse: Response;
    try {
      tokenResponse = await fetch(tokenUrl, {
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: this.resolveSocialCallbackUrl(providerCode),
        }),
        headers: {
          accept: 'application/json',
          'content-type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
      });
    } catch (error) {
      throw new OAuthExchangeError(
        normalizeOAuthRequestError(error),
        error instanceof Error
          ? error.message
          : `${providerCode} OAuth request failed.`,
      );
    }
    let tokenPayload: {
      error?: string;
      expires_in?: number;
      id_token?: string;
      scope?: string;
    };
    try {
      tokenPayload = (await tokenResponse.json()) as typeof tokenPayload;
    } catch {
      throw new OAuthExchangeError(
        'oauth_exchange_invalid_response',
        `${providerCode} OAuth token response is not valid JSON.`,
      );
    }

    if (!tokenResponse.ok || tokenPayload.error) {
      throw new OAuthExchangeError(
        normalizeOAuthExchangeProviderError(tokenPayload.error),
        `${providerCode} OAuth token exchange failed.`,
      );
    }
    if (!tokenPayload.id_token) {
      throw new OAuthExchangeError(
        'oauth_exchange_missing_id_token',
        `${providerCode} OAuth token response is missing id_token.`,
      );
    }

    const idToken = decodeJwtPayload(tokenPayload.id_token);
    const subject = readTokenSubject(idToken);

    return {
      expiresInSeconds: normalizeExpiresInSeconds(tokenPayload.expires_in),
      providerAccountId: `${shortProvider}:${subject}`,
      scopes: tokenPayload.scope || readScopeFallback(provider.config.scopes),
    };
  }

  private async loadCompletedSocialFlow(
    body: CompleteSocialAuthDto,
  ): Promise<SocialFlowState> {
    const providerCode = normalizeOAuthProviderCode(body.providerCode);
    const state = normalizeRequiredText(body.state, 'state');
    const flow = await this.prisma.integrationOAuthFlow.findUnique({
      where: { state },
      select: {
        id: true,
        providerCode: true,
        state: true,
        subjectType: true,
        subjectId: true,
        tokenId: true,
        status: true,
      },
    });

    if (
      !flow ||
      flow.providerCode !== providerCode ||
      flow.subjectType !== SOCIAL_LOGIN_SUBJECT_TYPE ||
      flow.status !== 'completed' ||
      !flow.tokenId
    ) {
      throw socialAuthBadRequest(
        'AUTH_SOCIAL_FLOW_NOT_COMPLETED',
        'Social login flow has not completed.',
        { providerCode },
      );
    }

    const token = await this.prisma.integrationOAuthToken.findUnique({
      where: { id: flow.tokenId },
    });

    if (!token || !isActiveToken(token)) {
      throw socialAuthBadRequest(
        'AUTH_SOCIAL_TOKEN_UNAVAILABLE',
        'Social login token is not available.',
        { providerCode },
      );
    }

    return { flow, token };
  }

  private async findActiveUserBindings(
    token: OAuthTokenRow,
  ): Promise<readonly OAuthTokenRow[]> {
    const rows = await this.prisma.integrationOAuthToken.findMany({
      where: {
        providerAccountId: token.providerAccountId,
        providerCode: token.providerCode,
        status: 'active',
        subjectType: 'user',
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return rows.filter(isActiveToken);
  }

  private async bindTokenToUser(token: OAuthTokenRow, userId: string) {
    const refs = createOAuthTokenSecretRefs({
      providerAccountId: token.providerAccountId,
      providerCode: token.providerCode,
      subjectId: userId,
    });

    await this.prisma.integrationOAuthToken.upsert({
      where: {
        providerCode_subjectId_providerAccountId: {
          providerAccountId: token.providerAccountId,
          providerCode: token.providerCode,
          subjectId: userId,
        },
      },
      create: {
        accessTokenRef: refs.accessTokenRef,
        expiresAt: token.expiresAt,
        id: createOAuthTokenId({
          providerAccountId: token.providerAccountId,
          providerCode: token.providerCode,
          subjectId: userId,
        }),
        lastRotatedAt: new Date(),
        providerAccountId: token.providerAccountId,
        providerCode: token.providerCode,
        refreshTokenRef: refs.refreshTokenRef,
        scopes: token.scopes as Prisma.InputJsonValue,
        status: 'active',
        subjectId: userId,
        subjectType: 'user',
      },
      update: {
        accessTokenRef: refs.accessTokenRef,
        expiresAt: token.expiresAt,
        lastRotatedAt: new Date(),
        refreshTokenRef: refs.refreshTokenRef,
        revokedAt: null,
        revokedBy: null,
        revokeReason: null,
        scopes: token.scopes as Prisma.InputJsonValue,
        status: 'active',
        subjectType: 'user',
      },
    });
  }

  private async revokeTemporaryToken(id: string, reason: string) {
    await this.prisma.integrationOAuthToken.updateMany({
      where: { id, subjectType: SOCIAL_LOGIN_SUBJECT_TYPE, status: 'active' },
      data: {
        revokedAt: new Date(),
        revokedBy: 'social-auth',
        revokeReason: reason,
        status: 'revoked',
      },
    });
  }

  private async getSocialProvider(
    providerCode: string,
  ): Promise<IntegrationProviderRecord> {
    const providers = await this.integration.listOAuthProviders({
      page: 1,
      pageSize: 100,
    });
    const provider = providers.items.find((item) => item.code === providerCode);

    if (!provider) {
      throw socialAuthBadRequest(
        'AUTH_SOCIAL_PROVIDER_NOT_FOUND',
        'Social login provider was not found.',
        { providerCode },
      );
    }

    return provider;
  }

  private toSocialProvider(
    provider: IntegrationProviderRecord,
  ): SocialAuthProviderDto {
    const profile = toOAuthProfileProviderDto(provider);
    const meta = SOCIAL_PROVIDER_META[provider.code] ?? {
      icon: 'link',
      name: provider.name,
    };
    const unsupported =
      profile.bindingStatus === 'ready' &&
      !SUPPORTED_SOCIAL_PROVIDERS.has(provider.code);
    const issue: SocialAuthProviderIssue | undefined = unsupported
      ? 'unsupported_provider'
      : profile.bindingIssue;
    const status = issue ? 'requires_configuration' : profile.bindingStatus;

    return {
      code: provider.code,
      icon: meta.icon,
      issue,
      message: formatSocialProviderMessage(issue),
      name: meta.name,
      status,
    };
  }

  private buildSocialLoginRedirectUrl(input: {
    audit: OAuthCallbackAuditRecord;
    flowId?: string;
    providerCode: string;
    state: string;
    status: 'accepted' | 'rejected';
  }): string {
    const target = new URL(resolveAdminSocialLoginUrl());
    target.searchParams.set('providerCode', input.providerCode);
    target.searchParams.set('state', input.state);
    target.searchParams.set('socialStatus', input.status);
    if (input.flowId) {
      target.searchParams.set('flowId', input.flowId);
    }
    if (input.status === 'rejected') {
      target.searchParams.set(
        'reason',
        input.audit.callbackError ?? 'rejected',
      );
    }
    return target.toString();
  }

  private resolveSocialCallbackUrl(providerCode: string): string {
    const shortProvider = providerCode.replace(/^oauth\./, '');
    const specific =
      process.env[
        `OPENCORE_${shortProvider.toUpperCase()}_OAUTH_SOCIAL_CALLBACK_URL`
      ]?.trim();
    if (specific) {
      return specific;
    }

    const publicApi =
      process.env.OPENCORE_DEPLOY_PUBLIC_API_BASE_URL?.trim() ??
      process.env.OPENCORE_API_PUBLIC_BASE_URL?.trim() ??
      'http://127.0.0.1:39172';
    return `${publicApi.replace(/\/+$/u, '')}/api/auth/social/callback/${shortProvider}`;
  }

  private resolveProviderCallbackUrl(
    provider: IntegrationProviderRecord,
    providerCode: string,
  ): string {
    const configured = readConfigString(provider.config.callbackPath);
    if (/^https?:\/\//iu.test(configured)) {
      return configured;
    }

    const shortProvider = providerCode.replace(/^oauth\./, '');
    const publicApi =
      process.env.OPENCORE_DEPLOY_PUBLIC_API_BASE_URL?.trim() ??
      process.env.OPENCORE_API_PUBLIC_BASE_URL?.trim() ??
      'http://127.0.0.1:39172';
    const path =
      configured || `/api/integrations/oauth/callback/${shortProvider}`;
    return `${publicApi.replace(/\/+$/u, '')}/${path.replace(/^\/+/u, '')}`;
  }
}

function formatSocialProviderMessage(
  issue: SocialAuthProviderIssue | undefined,
): string {
  switch (issue) {
    case undefined:
      return '可用于登录。';
    case 'disabled':
      return '该登录通道尚未启用，请先配置第三方应用。';
    case 'missing_config':
      return '缺少 OAuth 登录配置。';
    case 'placeholder_client':
      return '仍在使用占位客户端，请配置真实应用。';
    case 'secret_unverified':
      return '客户端密钥尚未通过校验。';
    case 'unsupported_provider':
      return '该通道已建模，登录回调适配尚未启用。';
  }
}

function normalizeRequiredText(value: unknown, field: string): string {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) {
    throw socialAuthBadRequest(
      'AUTH_SOCIAL_FIELD_REQUIRED',
      `Social auth ${field} is required.`,
      { field },
    );
  }
  return normalized;
}

function readConfigString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeExpiresInSeconds(value: unknown): number | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 60) {
    return 3600;
  }
  return Math.min(parsed, 90 * 24 * 60 * 60);
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const payload = token.split('.')[1];
  if (!payload) {
    throw new Error('OIDC id_token payload is missing.');
  }

  const normalized = payload.replace(/-/gu, '+').replace(/_/gu, '/');
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    '=',
  );
  return JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as Record<
    string,
    unknown
  >;
}

function readTokenSubject(payload: Record<string, unknown>): string {
  for (const key of ['oid', 'sub', 'email']) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  throw new Error('OIDC id_token subject is missing.');
}

function readScopeFallback(value: unknown): string {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === 'string').join(' ');
  }
  return '';
}

class OAuthExchangeError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'OAuthExchangeError';
    Object.setPrototypeOf(this, OAuthExchangeError.prototype);
  }
}

function readOAuthExchangeErrorCode(error: unknown): string {
  if (
    error instanceof OAuthExchangeError ||
    (typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      error.name === 'OAuthExchangeError')
  ) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string') {
      return code;
    }
  }
  return 'oauth_exchange_failed';
}

function normalizeOAuthExchangeProviderError(error: unknown): string {
  const raw = typeof error === 'string' ? error.trim().toLowerCase() : '';
  const normalized = raw.replace(/[^a-z0-9]+/gu, '_').replace(/^_+|_+$/gu, '');

  switch (normalized) {
    case 'bad_verification_code':
      return 'oauth_exchange_bad_verification_code';
    case 'incorrect_client_credentials':
      return 'oauth_exchange_incorrect_client_credentials';
    case 'redirect_uri_mismatch':
      return 'oauth_exchange_redirect_uri_mismatch';
    default:
      return normalized
        ? `oauth_exchange_${normalized.slice(0, 80)}`
        : 'oauth_exchange_failed';
  }
}

function normalizeOAuthRequestError(error: unknown): string {
  const code = readOAuthRequestErrorCode(error);
  return code
    ? `oauth_exchange_request_failed_${code.slice(0, 80)}`
    : 'oauth_exchange_request_failed';
}

function readOAuthRequestErrorCode(error: unknown): string {
  if (typeof error !== 'object' || error === null) {
    return '';
  }

  const directCode = sanitizeOAuthErrorCode((error as { code?: unknown }).code);
  if (directCode) {
    return directCode;
  }

  const cause = (error as { cause?: unknown }).cause;
  if (typeof cause !== 'object' || cause === null) {
    return '';
  }

  return sanitizeOAuthErrorCode((cause as { code?: unknown }).code);
}

function sanitizeOAuthErrorCode(value: unknown): string {
  return typeof value === 'string'
    ? value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/gu, '_')
        .replace(/^_+|_+$/gu, '')
    : '';
}

function isActiveToken(token: OAuthTokenRow): boolean {
  return (
    token.status === 'active' &&
    (!token.expiresAt || token.expiresAt.getTime() > Date.now())
  );
}

function resolveAdminSocialLoginUrl(): string {
  const configured = process.env.OPENCORE_SOCIAL_LOGIN_REDIRECT_URL?.trim();
  if (configured) {
    return configured;
  }

  const publicAdmin = process.env.OPENCORE_DEPLOY_PUBLIC_ADMIN_BASE_URL?.trim();
  if (publicAdmin) {
    return `${publicAdmin.replace(/\/+$/u, '')}/user/social-login`;
  }

  return 'http://127.0.0.1:39174/user/social-login';
}

function socialAuthBadRequest(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): BadRequestException {
  return new BadRequestException(
    createApiErrorBody({ code, message, details }),
  );
}
