import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { createApiErrorBody } from '@opencore/common';
import type { SecurityRequestWithAuth } from '@opencore/security';
import {
  RequireAuthenticated,
  RequirePermission,
} from '../../core/rbac/permissions.decorator';
import {
  CreateIntegrationProviderDto,
  CreateIntegrationTemplateDto,
  CreateOutboxMessageDto,
  FailOutboxMessageDto,
  IntegrationDesignDto,
  IntegrationOutboxCallbackDto,
  IntegrationOutboxDto,
  IntegrationOutboxPageDto,
  IntegrationOutboxProcessResultDto,
  IntegrationOutboxQueryDto,
  IntegrationOutboxScheduleResultDto,
  IntegrationOutboxTestResultDto,
  IntegrationProviderAuditLogPageDto,
  IntegrationProviderDiagnosticsDto,
  IntegrationProviderDto,
  IntegrationProviderHealthAuditDto,
  IntegrationProviderPageDto,
  IntegrationProviderQueryDto,
  IntegrationProviderTestResultDto,
  IntegrationSummaryDto,
  IntegrationTemplateDto,
  IntegrationTemplatePageDto,
  IntegrationTemplateQueryDto,
  OAuthCallbackContractDto,
  OAuthCallbackAuditPageDto,
  OAuthCallbackAuditQueryDto,
  OAuthCallbackResultDto,
  OAuthFlowDto,
  OAuthFlowPageDto,
  OAuthFlowQueryDto,
  OAuthProfileAccountDto,
  OAuthProfileProviderDto,
  OAuthProviderCallbackDto,
  OAuthTokenDto,
  OAuthTokenInventorySummaryDto,
  OAuthTokenPageDto,
  OAuthTokenQueryDto,
  PageQueryDto,
  ProcessOutboxDto,
  PreviewTemplateDto,
  PublishWebSocketRuntimeEventDto,
  RevokeOAuthTokenDto,
  ScheduleOutboxDto,
  StartOAuthFlowDto,
  StartOAuthProfileFlowDto,
  TestIntegrationProviderDto,
  TemplatePreviewDto,
  TestOutboxMessageDto,
  UpdateIntegrationProviderDto,
  UnbindOAuthProfileAccountDto,
  WebSocketRuntimeDiagnosticsDto,
  WebSocketRuntimeEventDto,
  WebSocketRuntimeStreamQueryDto,
} from './integration.dto';
import {
  IntegrationRepository,
  normalizeOAuthProviderCode,
} from './integration.repository';

type SseResponse = {
  end?: () => void;
  flushHeaders?: () => void;
  set(headers: Record<string, string>): void;
  write(chunk: string): void;
};

type OAuthCallbackHttpResponse = {
  redirect(status: number, url: string): void;
};

type OAuthExchangeResult = {
  expiresInSeconds: number | null;
  providerAccountId: string;
  scopes: string;
};

const REAL_OAUTH_CALLBACK_PROVIDERS = new Set([
  'oauth.github',
  'oauth.google',
  'oauth.microsoft',
]);

type RequestWithUser = SecurityRequestWithAuth;

@ApiBearerAuth()
@Controller('integrations')
export class IntegrationController {
  constructor(private readonly repository: IntegrationRepository) {}

  @Get('summary')
  @ApiTags('Integration')
  @RequirePermission('integration:provider:read')
  @ApiOkResponse({ type: IntegrationSummaryDto })
  getSummary(): Promise<IntegrationSummaryDto> {
    return this.repository.getSummary();
  }

  @Get('providers')
  @ApiTags('Integration Providers')
  @RequirePermission('integration:provider:read')
  @ApiOkResponse({ type: IntegrationProviderPageDto })
  listProviders(
    @Query() query: IntegrationProviderQueryDto,
  ): Promise<IntegrationProviderPageDto> {
    return this.repository.listProviders(query);
  }

  @Get('providers/health-audit')
  @ApiTags('Integration Providers')
  @RequirePermission('integration:provider:read')
  @ApiOkResponse({ type: IntegrationProviderHealthAuditDto })
  getProviderHealthAudit(): Promise<IntegrationProviderHealthAuditDto> {
    return this.repository.getProviderHealthAudit();
  }

  @Get('providers/:code')
  @ApiTags('Integration Providers')
  @RequirePermission('integration:provider:read')
  @ApiOkResponse({ type: IntegrationProviderDto })
  getProvider(@Param('code') code: string): Promise<IntegrationProviderDto> {
    return this.repository.getProvider(code);
  }

  @Post('providers')
  @ApiTags('Integration Providers')
  @RequirePermission('integration:provider:create')
  @ApiOkResponse({ type: IntegrationProviderDto })
  createProvider(
    @Body() body: CreateIntegrationProviderDto,
  ): Promise<IntegrationProviderDto> {
    return this.repository.createProvider(body);
  }

  @Patch('providers/:code')
  @ApiTags('Integration Providers')
  @RequirePermission('integration:provider:update')
  @ApiOkResponse({ type: IntegrationProviderDto })
  updateProvider(
    @Param('code') code: string,
    @Body() body: UpdateIntegrationProviderDto,
  ): Promise<IntegrationProviderDto> {
    return this.repository.updateProvider(code, body);
  }

  @Patch('providers/:code/enable')
  @ApiTags('Integration Providers')
  @RequirePermission('integration:provider:update')
  @ApiOkResponse({ type: IntegrationProviderDto })
  enableProvider(@Param('code') code: string): Promise<IntegrationProviderDto> {
    return this.repository.enableProvider(code);
  }

  @Patch('providers/:code/disable')
  @ApiTags('Integration Providers')
  @RequirePermission('integration:provider:update')
  @ApiOkResponse({ type: IntegrationProviderDto })
  disableProvider(
    @Param('code') code: string,
  ): Promise<IntegrationProviderDto> {
    return this.repository.disableProvider(code);
  }

  @Post('providers/:code/health-check')
  @ApiTags('Integration Providers')
  @RequirePermission('integration:provider:manage')
  @ApiOkResponse({ type: IntegrationProviderDto })
  checkProviderHealth(
    @Param('code') code: string,
  ): Promise<IntegrationProviderDto> {
    return this.repository.checkProviderHealth(code);
  }

  @Post('providers/:code/test')
  @ApiTags('Integration Providers')
  @RequirePermission('integration:provider:manage')
  @ApiOkResponse({ type: IntegrationProviderTestResultDto })
  testProvider(
    @Param('code') code: string,
    @Body() body: TestIntegrationProviderDto,
  ): Promise<IntegrationProviderTestResultDto> {
    return this.repository.testProvider(code, body);
  }

  @Get('providers/:code/diagnostics')
  @ApiTags('Integration Providers')
  @RequirePermission('integration:provider:read')
  @ApiOkResponse({ type: IntegrationProviderDiagnosticsDto })
  getProviderDiagnostics(
    @Param('code') code: string,
  ): Promise<IntegrationProviderDiagnosticsDto> {
    return this.repository.getProviderDiagnostics(code);
  }

  @Get('providers/:code/audit-logs')
  @ApiTags('Integration Providers')
  @RequirePermission('integration:provider:read')
  @ApiOkResponse({ type: IntegrationProviderAuditLogPageDto })
  listProviderAuditLogs(
    @Param('code') code: string,
    @Query() query: PageQueryDto,
  ): Promise<IntegrationProviderAuditLogPageDto> {
    return this.repository.listProviderAuditLogs(code, query);
  }

  @Post('outbox/schedule/run')
  @ApiTags('Integration')
  @RequirePermission('integration:provider:manage')
  @ApiOkResponse({ type: IntegrationOutboxScheduleResultDto })
  runOutboxSchedule(
    @Body() body: ScheduleOutboxDto,
  ): Promise<IntegrationOutboxScheduleResultDto> {
    return this.repository.runOutboxSchedule(body);
  }

  @Get('mail/templates')
  @ApiTags('Integration Mail')
  @RequirePermission('integration:mail:read')
  @ApiOkResponse({ type: IntegrationTemplatePageDto })
  listMailTemplates(
    @Query() query: IntegrationTemplateQueryDto,
  ): Promise<IntegrationTemplatePageDto> {
    return this.repository.listTemplates('mail', query);
  }

  @Get('mail/templates/:code')
  @ApiTags('Integration Mail')
  @RequirePermission('integration:mail:read')
  @ApiOkResponse({ type: IntegrationTemplateDto })
  getMailTemplate(
    @Param('code') code: string,
  ): Promise<IntegrationTemplateDto> {
    return this.repository.getTemplate('mail', code);
  }

  @Post('mail/templates')
  @ApiTags('Integration Mail')
  @RequirePermission('integration:mail:create')
  @ApiOkResponse({ type: IntegrationTemplateDto })
  createMailTemplate(
    @Body() body: CreateIntegrationTemplateDto,
  ): Promise<IntegrationTemplateDto> {
    return this.repository.createTemplate('mail', body);
  }

  @Post('mail/preview')
  @ApiTags('Integration Mail')
  @RequirePermission('integration:mail:read')
  @ApiOkResponse({ type: TemplatePreviewDto })
  previewMailTemplate(
    @Body() body: PreviewTemplateDto,
  ): Promise<TemplatePreviewDto> {
    return this.repository.previewTemplate('mail', body);
  }

  @Get('mail/outbox')
  @ApiTags('Integration Mail')
  @RequirePermission('integration:mail:read')
  @ApiOkResponse({ type: IntegrationOutboxPageDto })
  listMailOutbox(
    @Query() query: IntegrationOutboxQueryDto,
  ): Promise<IntegrationOutboxPageDto> {
    return this.repository.listOutbox('mail', query);
  }

  @Get('mail/outbox/:id')
  @ApiTags('Integration Mail')
  @RequirePermission('integration:mail:read')
  @ApiOkResponse({ type: IntegrationOutboxDto })
  getMailOutboxMessage(@Param('id') id: string): Promise<IntegrationOutboxDto> {
    return this.repository.getOutboxMessage('mail', id);
  }

  @Post('mail/outbox')
  @ApiTags('Integration Mail')
  @RequirePermission('integration:mail:manage')
  @ApiOkResponse({ type: IntegrationOutboxDto })
  enqueueMail(
    @Body() body: CreateOutboxMessageDto,
  ): Promise<IntegrationOutboxDto> {
    return this.repository.enqueueOutbox('mail', body);
  }

  @Post('mail/test-send')
  @ApiTags('Integration Mail')
  @RequirePermission('integration:mail:manage')
  @ApiOkResponse({ type: IntegrationOutboxTestResultDto })
  sendMailTest(
    @Body() body: TestOutboxMessageDto,
  ): Promise<IntegrationOutboxTestResultDto> {
    return this.repository.sendTestOutbox('mail', body);
  }

  @Patch('mail/outbox/:id/sent')
  @ApiTags('Integration Mail')
  @RequirePermission('integration:mail:manage')
  @ApiOkResponse({ type: IntegrationOutboxDto })
  markMailOutboxSent(@Param('id') id: string): Promise<IntegrationOutboxDto> {
    return this.repository.markOutboxSent('mail', id);
  }

  @Patch('mail/outbox/:id/failed')
  @ApiTags('Integration Mail')
  @RequirePermission('integration:mail:manage')
  @ApiOkResponse({ type: IntegrationOutboxDto })
  markMailOutboxFailed(
    @Param('id') id: string,
    @Body() body: FailOutboxMessageDto,
  ): Promise<IntegrationOutboxDto> {
    return this.repository.markOutboxFailed('mail', id, body);
  }

  @Patch('mail/outbox/:id/retry')
  @ApiTags('Integration Mail')
  @RequirePermission('integration:mail:manage')
  @ApiOkResponse({ type: IntegrationOutboxDto })
  retryMailOutbox(@Param('id') id: string): Promise<IntegrationOutboxDto> {
    return this.repository.retryOutbox('mail', id);
  }

  @Post('mail/outbox/process')
  @ApiTags('Integration Mail')
  @RequirePermission('integration:mail:manage')
  @ApiOkResponse({ type: IntegrationOutboxProcessResultDto })
  processMailOutbox(
    @Body() body: ProcessOutboxDto,
  ): Promise<IntegrationOutboxProcessResultDto> {
    return this.repository.processOutbox('mail', body);
  }

  @Post('mail/outbox/callback')
  @ApiTags('Integration Mail')
  @RequirePermission('integration:mail:manage')
  @ApiOkResponse({ type: IntegrationOutboxDto })
  callbackMailOutbox(
    @Body() body: IntegrationOutboxCallbackDto,
  ): Promise<IntegrationOutboxDto> {
    return this.repository.callbackOutbox('mail', body);
  }

  @Get('sms/templates')
  @ApiTags('Integration SMS')
  @RequirePermission('integration:sms:read')
  @ApiOkResponse({ type: IntegrationTemplatePageDto })
  listSmsTemplates(
    @Query() query: IntegrationTemplateQueryDto,
  ): Promise<IntegrationTemplatePageDto> {
    return this.repository.listTemplates('sms', query);
  }

  @Get('sms/templates/:code')
  @ApiTags('Integration SMS')
  @RequirePermission('integration:sms:read')
  @ApiOkResponse({ type: IntegrationTemplateDto })
  getSmsTemplate(@Param('code') code: string): Promise<IntegrationTemplateDto> {
    return this.repository.getTemplate('sms', code);
  }

  @Post('sms/templates')
  @ApiTags('Integration SMS')
  @RequirePermission('integration:sms:create')
  @ApiOkResponse({ type: IntegrationTemplateDto })
  createSmsTemplate(
    @Body() body: CreateIntegrationTemplateDto,
  ): Promise<IntegrationTemplateDto> {
    return this.repository.createTemplate('sms', body);
  }

  @Post('sms/preview')
  @ApiTags('Integration SMS')
  @RequirePermission('integration:sms:read')
  @ApiOkResponse({ type: TemplatePreviewDto })
  previewSmsTemplate(
    @Body() body: PreviewTemplateDto,
  ): Promise<TemplatePreviewDto> {
    return this.repository.previewTemplate('sms', body);
  }

  @Get('sms/outbox')
  @ApiTags('Integration SMS')
  @RequirePermission('integration:sms:read')
  @ApiOkResponse({ type: IntegrationOutboxPageDto })
  listSmsOutbox(
    @Query() query: IntegrationOutboxQueryDto,
  ): Promise<IntegrationOutboxPageDto> {
    return this.repository.listOutbox('sms', query);
  }

  @Get('sms/outbox/:id')
  @ApiTags('Integration SMS')
  @RequirePermission('integration:sms:read')
  @ApiOkResponse({ type: IntegrationOutboxDto })
  getSmsOutboxMessage(@Param('id') id: string): Promise<IntegrationOutboxDto> {
    return this.repository.getOutboxMessage('sms', id);
  }

  @Post('sms/outbox')
  @ApiTags('Integration SMS')
  @RequirePermission('integration:sms:manage')
  @ApiOkResponse({ type: IntegrationOutboxDto })
  enqueueSms(
    @Body() body: CreateOutboxMessageDto,
  ): Promise<IntegrationOutboxDto> {
    return this.repository.enqueueOutbox('sms', body);
  }

  @Post('sms/test-send')
  @ApiTags('Integration SMS')
  @RequirePermission('integration:sms:manage')
  @ApiOkResponse({ type: IntegrationOutboxTestResultDto })
  sendSmsTest(
    @Body() body: TestOutboxMessageDto,
  ): Promise<IntegrationOutboxTestResultDto> {
    return this.repository.sendTestOutbox('sms', body);
  }

  @Patch('sms/outbox/:id/sent')
  @ApiTags('Integration SMS')
  @RequirePermission('integration:sms:manage')
  @ApiOkResponse({ type: IntegrationOutboxDto })
  markSmsOutboxSent(@Param('id') id: string): Promise<IntegrationOutboxDto> {
    return this.repository.markOutboxSent('sms', id);
  }

  @Patch('sms/outbox/:id/failed')
  @ApiTags('Integration SMS')
  @RequirePermission('integration:sms:manage')
  @ApiOkResponse({ type: IntegrationOutboxDto })
  markSmsOutboxFailed(
    @Param('id') id: string,
    @Body() body: FailOutboxMessageDto,
  ): Promise<IntegrationOutboxDto> {
    return this.repository.markOutboxFailed('sms', id, body);
  }

  @Patch('sms/outbox/:id/retry')
  @ApiTags('Integration SMS')
  @RequirePermission('integration:sms:manage')
  @ApiOkResponse({ type: IntegrationOutboxDto })
  retrySmsOutbox(@Param('id') id: string): Promise<IntegrationOutboxDto> {
    return this.repository.retryOutbox('sms', id);
  }

  @Post('sms/outbox/process')
  @ApiTags('Integration SMS')
  @RequirePermission('integration:sms:manage')
  @ApiOkResponse({ type: IntegrationOutboxProcessResultDto })
  processSmsOutbox(
    @Body() body: ProcessOutboxDto,
  ): Promise<IntegrationOutboxProcessResultDto> {
    return this.repository.processOutbox('sms', body);
  }

  @Post('sms/outbox/callback')
  @ApiTags('Integration SMS')
  @RequirePermission('integration:sms:manage')
  @ApiOkResponse({ type: IntegrationOutboxDto })
  callbackSmsOutbox(
    @Body() body: IntegrationOutboxCallbackDto,
  ): Promise<IntegrationOutboxDto> {
    return this.repository.callbackOutbox('sms', body);
  }

  @Get('oauth/profile/accounts')
  @ApiTags('Integration OAuth')
  @RequireAuthenticated()
  @ApiOkResponse({ type: [OAuthProfileAccountDto] })
  listProfileOAuthAccounts(
    @Req() request: RequestWithUser,
  ): Promise<readonly OAuthProfileAccountDto[]> {
    return this.repository.listProfileOAuthAccounts(
      getAuthenticatedUserId(request),
    );
  }

  @Get('oauth/profile/providers')
  @ApiTags('Integration OAuth')
  @RequireAuthenticated()
  @ApiOkResponse({ type: [OAuthProfileProviderDto] })
  listProfileOAuthProviders(): Promise<readonly OAuthProfileProviderDto[]> {
    return this.repository.listProfileOAuthProviders();
  }

  @Post('oauth/profile/flows')
  @ApiTags('Integration OAuth')
  @RequireAuthenticated()
  @ApiOkResponse({ type: OAuthFlowDto })
  startProfileOAuthFlow(
    @Req() request: RequestWithUser,
    @Body() body: StartOAuthProfileFlowDto,
  ): Promise<OAuthFlowDto> {
    return this.repository.startProfileOAuthFlow(
      getAuthenticatedUserId(request),
      body,
    );
  }

  @Patch('oauth/profile/accounts/:id/unbind')
  @ApiTags('Integration OAuth')
  @RequireAuthenticated()
  @ApiOkResponse({ type: OAuthProfileAccountDto })
  unbindProfileOAuthAccount(
    @Req() request: RequestWithUser,
    @Param('id') id: string,
    @Body() body: UnbindOAuthProfileAccountDto,
  ): Promise<OAuthProfileAccountDto> {
    return this.repository.unbindProfileOAuthAccount(
      getAuthenticatedUserId(request),
      id,
      getAuthenticatedUsername(request),
      body,
    );
  }

  @Get('oauth/providers')
  @ApiTags('Integration OAuth')
  @RequirePermission('integration:oauth:read')
  @ApiOkResponse({ type: IntegrationProviderPageDto })
  listOAuthProviders(
    @Query() query: IntegrationProviderQueryDto,
  ): Promise<IntegrationProviderPageDto> {
    return this.repository.listOAuthProviders(query);
  }

  @Get('oauth/callback-contract')
  @ApiTags('Integration OAuth')
  @RequirePermission('integration:oauth:read')
  @ApiOkResponse({ type: OAuthCallbackContractDto })
  getOAuthCallbackContract(): OAuthCallbackContractDto {
    return this.repository.getOAuthCallbackContract();
  }

  @Post('oauth/flows')
  @ApiTags('Integration OAuth')
  @RequirePermission('integration:oauth:manage')
  @ApiOkResponse({ type: OAuthFlowDto })
  startOAuthFlow(@Body() body: StartOAuthFlowDto): Promise<OAuthFlowDto> {
    return this.repository.startOAuthFlow(body);
  }

  @Get('oauth/flows')
  @ApiTags('Integration OAuth')
  @RequirePermission('integration:oauth:read')
  @ApiOkResponse({ type: OAuthFlowPageDto })
  listOAuthFlows(@Query() query: OAuthFlowQueryDto): Promise<OAuthFlowPageDto> {
    return this.repository.listOAuthFlows(query);
  }

  @Get('oauth/callback/:providerCode')
  @ApiTags('Integration OAuth')
  @ApiOkResponse({ type: OAuthCallbackResultDto })
  async callbackOAuthProvider(
    @Param('providerCode') providerCode: string,
    @Query() query: OAuthProviderCallbackDto,
    @Res({ passthrough: true }) response: OAuthCallbackHttpResponse,
  ): Promise<OAuthCallbackResultDto | undefined> {
    const callback = await this.resolveRealOAuthCallback(providerCode, query);
    const result = await this.repository.callbackOAuthProvider(
      providerCode,
      callback,
    );

    if (query.response === 'json') {
      return result;
    }

    response.redirect(302, buildOAuthCallbackRedirectUrl(result));
    return undefined;
  }

  private async resolveRealOAuthCallback(
    providerCodeInput: string,
    query: OAuthProviderCallbackDto,
  ): Promise<OAuthProviderCallbackDto> {
    if (query.error || query.providerAccountId || !query.code) {
      return query;
    }

    const providerCode = normalizeOAuthProviderCode(providerCodeInput);
    if (!REAL_OAUTH_CALLBACK_PROVIDERS.has(providerCode)) {
      return query;
    }

    const flow = await this.findOAuthCallbackFlow(providerCode, query.state);
    if (!flow) {
      return query;
    }

    try {
      const provider =
        await this.repository.getProviderForOAuthExchange(providerCode);
      const redirectUri = resolveOAuthExchangeRedirectUri(
        provider.config.callbackPath,
        flow.redirectUri,
        providerCode,
      );
      const exchanged =
        providerCode === 'oauth.github'
          ? await exchangeGitHubOAuthCode(query.code, provider, redirectUri)
          : await exchangeOidcOAuthCode(query.code, provider, redirectUri);

      return {
        ...query,
        expiresInSeconds: exchanged.expiresInSeconds,
        providerAccountId: exchanged.providerAccountId,
        scopes: exchanged.scopes,
      };
    } catch (error) {
      return {
        ...query,
        code: undefined,
        error: readOAuthExchangeErrorCode(error),
      };
    }
  }

  private async findOAuthCallbackFlow(providerCode: string, state: string) {
    const flows = await this.repository.listOAuthFlows({
      page: 1,
      pageSize: 100,
      providerCode,
    });

    return flows.items.find((flow) => flow.state === state);
  }

  @Get('oauth/callback-audits')
  @ApiTags('Integration OAuth')
  @RequirePermission('integration:oauth:read')
  @ApiOkResponse({ type: OAuthCallbackAuditPageDto })
  listOAuthCallbackAudits(
    @Query() query: OAuthCallbackAuditQueryDto,
  ): Promise<OAuthCallbackAuditPageDto> {
    return this.repository.listOAuthCallbackAudits(query);
  }

  @Get('oauth/tokens/summary')
  @ApiTags('Integration OAuth')
  @RequirePermission('integration:oauth:read')
  @ApiOkResponse({ type: OAuthTokenInventorySummaryDto })
  getOAuthTokenSummary(): Promise<OAuthTokenInventorySummaryDto> {
    return this.repository.getOAuthTokenSummary();
  }

  @Get('oauth/tokens')
  @ApiTags('Integration OAuth')
  @RequirePermission('integration:oauth:read')
  @ApiOkResponse({ type: OAuthTokenPageDto })
  listOAuthTokens(
    @Query() query: OAuthTokenQueryDto,
  ): Promise<OAuthTokenPageDto> {
    return this.repository.listOAuthTokens(query);
  }

  @Get('oauth/tokens/:id')
  @ApiTags('Integration OAuth')
  @RequirePermission('integration:oauth:read')
  @ApiOkResponse({ type: OAuthTokenDto })
  getOAuthToken(@Param('id') id: string): Promise<OAuthTokenDto> {
    return this.repository.getOAuthToken(id);
  }

  @Patch('oauth/tokens/:id/revoke')
  @ApiTags('Integration OAuth')
  @RequirePermission('integration:oauth:manage')
  @ApiOkResponse({ type: OAuthTokenDto })
  revokeOAuthToken(
    @Param('id') id: string,
    @Body() body: RevokeOAuthTokenDto,
  ): Promise<OAuthTokenDto> {
    return this.repository.revokeOAuthToken(id, body);
  }

  @Get('designs/wechat')
  @ApiTags('Integration WeChat')
  @RequirePermission('integration:wechat:read')
  @ApiOkResponse({ type: IntegrationDesignDto })
  getWeChatDesign(): IntegrationDesignDto {
    return this.repository.getDesign('wechat');
  }

  @Get('designs/websocket')
  @ApiTags('Integration WebSocket')
  @RequirePermission('integration:websocket:read')
  @ApiOkResponse({ type: IntegrationDesignDto })
  getWebSocketDesign(): IntegrationDesignDto {
    return this.repository.getDesign('websocket');
  }

  @Get('websocket/runtime')
  @ApiTags('Integration WebSocket')
  @RequirePermission('integration:websocket:read')
  @ApiOkResponse({ type: WebSocketRuntimeDiagnosticsDto })
  getWebSocketRuntimeDiagnostics(): Promise<WebSocketRuntimeDiagnosticsDto> {
    return this.repository.getWebSocketRuntimeDiagnostics();
  }

  @Post('websocket/runtime/events')
  @ApiTags('Integration WebSocket')
  @RequirePermission('integration:websocket:read')
  @ApiOkResponse({ type: WebSocketRuntimeEventDto })
  publishWebSocketRuntimeEvent(
    @Body() body: PublishWebSocketRuntimeEventDto,
  ): Promise<WebSocketRuntimeEventDto> {
    return this.repository.publishWebSocketRuntimeEvent(body);
  }

  @Get('websocket/runtime/stream')
  @ApiTags('Integration WebSocket')
  @ApiProduces('text/event-stream')
  @RequirePermission('integration:websocket:read')
  @ApiOkResponse({ type: WebSocketRuntimeEventDto })
  streamWebSocketRuntimeEvents(
    @Req() request: RequestWithUser,
    @Res() response: SseResponse,
    @Query() query: WebSocketRuntimeStreamQueryDto,
  ): void {
    response.set({
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'content-type': 'text/event-stream; charset=utf-8',
      'x-accel-buffering': 'no',
    });
    response.flushHeaders?.();

    const handle = this.repository.openWebSocketRuntimeConnection({
      subjectId: getAuthenticatedUserId(request),
      query,
      emit: (event) => writeSseEvent(response, event.type, event),
    });
    const heartbeat = setInterval(() => {
      handle.heartbeat();
      response.write(': heartbeat\n\n');
    }, 15000);
    const cleanup = () => {
      clearInterval(heartbeat);
      handle.close('client_closed');
    };

    getCloseableRequest(request).on('close', cleanup);
    writeSseEvent(response, 'runtime.connected', handle.connection);
    writeSseEvent(response, 'runtime.subscribed', handle.subscription);
  }

  @Get('designs/pay')
  @ApiTags('Integration Payment')
  @RequirePermission('integration:billing-design:read')
  @ApiOkResponse({ type: IntegrationDesignDto })
  getPaymentDesign(): IntegrationDesignDto {
    return this.repository.getDesign('pay');
  }
}

function getAuthenticatedUserId(request: RequestWithUser): string {
  const userId = request.user?.id;

  if (!userId) {
    throw new UnauthorizedException(
      createApiErrorBody({
        code: 'AUTH_USER_MISSING',
        message: 'Missing authenticated user',
      }),
    );
  }

  return userId;
}

function getAuthenticatedUsername(request: RequestWithUser): string {
  const username = request.user?.username;

  if (!username) {
    throw new UnauthorizedException(
      createApiErrorBody({
        code: 'AUTH_USER_MISSING',
        message: 'Missing authenticated user',
      }),
    );
  }

  return username;
}

function buildOAuthCallbackRedirectUrl(result: OAuthCallbackResultDto): string {
  if (result.subjectType === 'social-login') {
    return buildSocialOAuthCallbackRedirectUrl(result);
  }

  const redirectUrl = new URL(resolveOAuthCallbackRedirectTarget());

  if (redirectUrl.pathname === '/' || redirectUrl.pathname === '') {
    redirectUrl.pathname = '/personal/profile';
  }

  redirectUrl.searchParams.set('oauthStatus', result.status);
  redirectUrl.searchParams.set('oauthProvider', result.providerCode);
  if (result.flowId) {
    redirectUrl.searchParams.set('oauthFlowId', result.flowId);
  }

  return redirectUrl.toString();
}

function buildSocialOAuthCallbackRedirectUrl(
  result: OAuthCallbackResultDto,
): string {
  const redirectUrl = new URL(resolveSocialOAuthCallbackRedirectTarget());
  redirectUrl.searchParams.set('providerCode', result.providerCode);
  redirectUrl.searchParams.set('state', result.state);
  redirectUrl.searchParams.set('socialStatus', result.status);
  if (result.flowId) {
    redirectUrl.searchParams.set('flowId', result.flowId);
  }
  if (result.status === 'rejected') {
    redirectUrl.searchParams.set(
      'reason',
      result.audit.callbackError ?? 'rejected',
    );
  }
  return redirectUrl.toString();
}

function resolveOAuthCallbackRedirectTarget(): string {
  const configured = process.env.OPENCORE_OAUTH_CALLBACK_REDIRECT_URL?.trim();
  if (configured) {
    return configured;
  }

  const adminBaseUrl =
    process.env.OPENCORE_DEPLOY_PUBLIC_ADMIN_BASE_URL?.trim();
  if (adminBaseUrl) {
    return `${adminBaseUrl.replace(/\/+$/u, '')}/personal/profile`;
  }

  return 'http://127.0.0.1:39174/personal/profile';
}

function resolveSocialOAuthCallbackRedirectTarget(): string {
  const configured = process.env.OPENCORE_SOCIAL_LOGIN_REDIRECT_URL?.trim();
  if (configured) {
    return configured;
  }

  const adminBaseUrl =
    process.env.OPENCORE_DEPLOY_PUBLIC_ADMIN_BASE_URL?.trim();
  if (adminBaseUrl) {
    return `${adminBaseUrl.replace(/\/+$/u, '')}/user/social-login`;
  }

  return 'http://127.0.0.1:39174/user/social-login';
}

function resolveOAuthExchangeRedirectUri(
  providerCallbackPath: unknown,
  flowRedirectUri: string | undefined,
  providerCode: string,
): string {
  const configured =
    flowRedirectUri?.trim() || readConfigString(providerCallbackPath);
  if (/^https?:\/\//iu.test(configured)) {
    return configured;
  }

  const shortProvider = providerCode.replace(/^oauth\./, '');
  const path =
    configured || `/api/integrations/oauth/callback/${shortProvider}`;
  const publicApi =
    process.env.OPENCORE_DEPLOY_PUBLIC_API_BASE_URL?.trim() ??
    process.env.OPENCORE_API_PUBLIC_BASE_URL?.trim() ??
    'http://127.0.0.1:39172';
  return `${publicApi.replace(/\/+$/u, '')}/${path.replace(/^\/+/u, '')}`;
}

async function exchangeGitHubOAuthCode(
  code: string,
  provider: { config: Record<string, unknown> },
  redirectUri: string,
): Promise<OAuthExchangeResult> {
  const clientId = readConfigString(provider.config.clientId);
  const clientSecret = process.env.OPENCORE_GITHUB_OAUTH_CLIENT_SECRET?.trim();
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
        redirect_uri: redirectUri,
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
    expiresInSeconds: normalizeProviderTokenExpiresInSeconds(
      tokenPayload.expires_in,
    ),
    providerAccountId: `github:${userPayload.id}`,
    scopes: tokenPayload.scope || 'read:user user:email',
  };
}

async function exchangeOidcOAuthCode(
  code: string,
  provider: { code: string; config: Record<string, unknown> },
  redirectUri: string,
): Promise<OAuthExchangeResult> {
  const shortProvider = provider.code.replace(/^oauth\./, '');
  const clientId = readConfigString(provider.config.clientId);
  const clientSecret =
    process.env[
      `OPENCORE_${shortProvider.toUpperCase()}_OAUTH_CLIENT_SECRET`
    ]?.trim();
  const tokenUrl = readConfigString(provider.config.tokenUrl);

  if (!clientId || !clientSecret || !tokenUrl) {
    throw new OAuthExchangeError(
      'oauth_exchange_not_configured',
      `${provider.code} OAuth is not configured.`,
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
        redirect_uri: redirectUri,
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
        : `${provider.code} OAuth request failed.`,
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
      `${provider.code} OAuth token response is not valid JSON.`,
    );
  }

  if (!tokenResponse.ok || tokenPayload.error) {
    throw new OAuthExchangeError(
      normalizeOAuthExchangeProviderError(tokenPayload.error),
      `${provider.code} OAuth token exchange failed.`,
    );
  }
  if (!tokenPayload.id_token) {
    throw new OAuthExchangeError(
      'oauth_exchange_missing_id_token',
      `${provider.code} OAuth token response is missing id_token.`,
    );
  }

  const subject = readTokenSubject(decodeJwtPayload(tokenPayload.id_token));
  return {
    expiresInSeconds: normalizeProviderTokenExpiresInSeconds(
      tokenPayload.expires_in,
    ),
    providerAccountId: `${shortProvider}:${subject}`,
    scopes: tokenPayload.scope || readScopeFallback(provider.config.scopes),
  };
}

function normalizeProviderTokenExpiresInSeconds(value: unknown): number | null {
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

function readConfigString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function writeSseEvent(
  response: SseResponse,
  eventName: string,
  data: unknown,
): void {
  const id =
    data && typeof data === 'object' && 'id' in data
      ? String((data as { id?: unknown }).id)
      : `${Date.now()}`;
  response.write(`id: ${id}\n`);
  response.write(`event: ${eventName}\n`);
  response.write(`data: ${JSON.stringify(data)}\n\n`);
}

function getCloseableRequest(request: RequestWithUser): {
  on(event: 'close', listener: () => void): void;
} {
  return request as RequestWithUser & {
    on(event: 'close', listener: () => void): void;
  };
}
