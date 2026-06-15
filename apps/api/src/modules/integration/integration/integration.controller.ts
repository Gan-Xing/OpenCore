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
import type { SecurityRequestWithAuth } from '@opencore/security';
import { RequirePermission } from '../../core/rbac/permissions.decorator';
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
  TestIntegrationProviderDto,
  TemplatePreviewDto,
  TestOutboxMessageDto,
  UpdateIntegrationProviderDto,
  WebSocketRuntimeDiagnosticsDto,
  WebSocketRuntimeEventDto,
  WebSocketRuntimeStreamQueryDto,
} from './integration.dto';
import { IntegrationRepository } from './integration.repository';

type SseResponse = {
  end?: () => void;
  flushHeaders?: () => void;
  set(headers: Record<string, string>): void;
  write(chunk: string): void;
};

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
  callbackOAuthProvider(
    @Param('providerCode') providerCode: string,
    @Query() query: OAuthProviderCallbackDto,
  ): Promise<OAuthCallbackResultDto> {
    return this.repository.callbackOAuthProvider(providerCode, query);
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
    throw new UnauthorizedException('Missing authenticated user');
  }

  return userId;
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
