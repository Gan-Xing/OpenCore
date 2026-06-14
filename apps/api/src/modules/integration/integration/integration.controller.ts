import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
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
  IntegrationProviderDiagnosticsDto,
  IntegrationProviderDto,
  IntegrationProviderHealthAuditDto,
  IntegrationProviderPageDto,
  IntegrationProviderQueryDto,
  IntegrationSummaryDto,
  IntegrationTemplateDto,
  IntegrationTemplatePageDto,
  IntegrationTemplateQueryDto,
  OAuthCallbackContractDto,
  ProcessOutboxDto,
  PreviewTemplateDto,
  ScheduleOutboxDto,
  TemplatePreviewDto,
  UpdateIntegrationProviderDto,
} from './integration.dto';
import { IntegrationRepository } from './integration.repository';

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

  @Get('providers/:code/diagnostics')
  @ApiTags('Integration Providers')
  @RequirePermission('integration:provider:read')
  @ApiOkResponse({ type: IntegrationProviderDiagnosticsDto })
  getProviderDiagnostics(
    @Param('code') code: string,
  ): Promise<IntegrationProviderDiagnosticsDto> {
    return this.repository.getProviderDiagnostics(code);
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

  @Get('designs/pay')
  @ApiTags('Integration Payment')
  @RequirePermission('integration:billing-design:read')
  @ApiOkResponse({ type: IntegrationDesignDto })
  getPaymentDesign(): IntegrationDesignDto {
    return this.repository.getDesign('pay');
  }
}
