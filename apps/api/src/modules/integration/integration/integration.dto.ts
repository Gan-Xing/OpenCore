import { ApiProperty } from '@nestjs/swagger';
import { PageQueryDto } from '../../core/system-management/system-management.dto';

export { PageQueryDto };

export type IntegrationProviderType =
  | 'mail'
  | 'oauth'
  | 'pay'
  | 'sms'
  | 'websocket'
  | 'wechat';

export class IntegrationProviderDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty({ enum: ['mail', 'oauth', 'pay', 'sms', 'websocket', 'wechat'] })
  type!: IntegrationProviderType;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  enabled!: boolean;

  @ApiProperty()
  secretRef!: string;

  @ApiProperty()
  config!: Record<string, unknown>;

  @ApiProperty({ enum: ['unknown', 'healthy', 'degraded', 'disabled'] })
  healthStatus!: 'unknown' | 'healthy' | 'degraded' | 'disabled';

  @ApiProperty({ required: false })
  lastCheckedAt?: string;
}

export class IntegrationProviderPageDto {
  @ApiProperty({ type: [IntegrationProviderDto] })
  items!: readonly IntegrationProviderDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class IntegrationProviderQueryDto extends PageQueryDto {
  @ApiProperty({
    enum: ['mail', 'oauth', 'pay', 'sms', 'websocket', 'wechat'],
    required: false,
  })
  type?: IntegrationProviderType;

  @ApiProperty({ required: false })
  enabled?: boolean | string;

  @ApiProperty({
    enum: ['unknown', 'healthy', 'degraded', 'disabled'],
    required: false,
  })
  healthStatus?: 'unknown' | 'healthy' | 'degraded' | 'disabled';
}

export class IntegrationProviderSummaryDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  enabled!: number;

  @ApiProperty()
  disabled!: number;

  @ApiProperty()
  unknown!: number;

  @ApiProperty()
  healthy!: number;

  @ApiProperty()
  degraded!: number;
}

export class CreateIntegrationProviderDto {
  @ApiProperty()
  code!: string;

  @ApiProperty({ enum: ['mail', 'oauth', 'pay', 'sms', 'websocket', 'wechat'] })
  type!: IntegrationProviderType;

  @ApiProperty()
  name!: string;

  @ApiProperty({ required: false, default: false })
  enabled?: boolean;

  @ApiProperty()
  secretRef!: string;

  @ApiProperty()
  config!: Record<string, unknown>;
}

export class UpdateIntegrationProviderDto {
  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({ required: false })
  enabled?: boolean;

  @ApiProperty({ required: false })
  secretRef?: string;

  @ApiProperty({ required: false })
  config?: Record<string, unknown>;
}

export class IntegrationTemplateDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty({ enum: ['mail', 'sms'] })
  channel!: 'mail' | 'sms';

  @ApiProperty()
  name!: string;

  @ApiProperty({ required: false })
  subject?: string;

  @ApiProperty()
  body!: string;

  @ApiProperty()
  enabled!: boolean;
}

export class IntegrationTemplatePageDto {
  @ApiProperty({ type: [IntegrationTemplateDto] })
  items!: readonly IntegrationTemplateDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class IntegrationTemplateQueryDto extends PageQueryDto {
  @ApiProperty({ required: false })
  enabled?: boolean | string;
}

export class CreateIntegrationTemplateDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ required: false })
  subject?: string;

  @ApiProperty()
  body!: string;

  @ApiProperty({ required: false, default: true })
  enabled?: boolean;
}

export class IntegrationOutboxDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ['mail', 'sms'] })
  channel!: 'mail' | 'sms';

  @ApiProperty()
  providerCode!: string;

  @ApiProperty({ required: false })
  templateCode?: string;

  @ApiProperty()
  recipient!: string;

  @ApiProperty()
  payload!: Record<string, unknown>;

  @ApiProperty({ enum: ['queued', 'sent', 'failed'] })
  status!: 'queued' | 'sent' | 'failed';

  @ApiProperty()
  retryCount!: number;

  @ApiProperty({ required: false })
  preview?: string;

  @ApiProperty({ required: false })
  error?: string;

  @ApiProperty({ required: false })
  sentAt?: string;

  @ApiProperty()
  createdAt!: string;
}

export class IntegrationOutboxPageDto {
  @ApiProperty({ type: [IntegrationOutboxDto] })
  items!: readonly IntegrationOutboxDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class IntegrationOutboxQueryDto extends PageQueryDto {
  @ApiProperty({ enum: ['queued', 'sent', 'failed'], required: false })
  status?: 'queued' | 'sent' | 'failed';

  @ApiProperty({ required: false })
  providerCode?: string;
}

export class IntegrationOutboxSummaryDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  queued!: number;

  @ApiProperty()
  sent!: number;

  @ApiProperty()
  failed!: number;
}

export class CreateOutboxMessageDto {
  @ApiProperty()
  providerCode!: string;

  @ApiProperty({ required: false })
  templateCode?: string;

  @ApiProperty()
  recipient!: string;

  @ApiProperty()
  payload!: Record<string, unknown>;
}

export class FailOutboxMessageDto {
  @ApiProperty()
  error!: string;
}

export class ProcessOutboxDto {
  @ApiProperty({ required: false })
  providerCode?: string;

  @ApiProperty({ required: false, default: 100 })
  limit?: number;
}

export class IntegrationOutboxProcessResultDto {
  @ApiProperty({ enum: ['mail', 'sms'] })
  channel!: 'mail' | 'sms';

  @ApiProperty({ required: false })
  providerCode?: string;

  @ApiProperty()
  attemptedCount!: number;

  @ApiProperty()
  sentCount!: number;

  @ApiProperty()
  skippedCount!: number;

  @ApiProperty()
  queuedCount!: number;
}

export class IntegrationOutboxCallbackDto {
  @ApiProperty()
  providerCode!: string;

  @ApiProperty()
  messageId!: string;

  @ApiProperty({ enum: ['sent', 'failed'] })
  status!: 'sent' | 'failed';

  @ApiProperty({ required: false })
  error?: string;

  @ApiProperty({
    description:
      'HMAC-SHA256 hex signature over channel, providerCode, messageId, status and error.',
  })
  signature!: string;
}

export class PreviewTemplateDto {
  @ApiProperty()
  templateCode!: string;

  @ApiProperty()
  payload!: Record<string, unknown>;
}

export class TemplatePreviewDto {
  @ApiProperty()
  channel!: 'mail' | 'sms';

  @ApiProperty()
  templateCode!: string;

  @ApiProperty({ required: false })
  subject?: string;

  @ApiProperty()
  body!: string;
}

export class OAuthCallbackContractDto {
  @ApiProperty()
  callbackPath!: string;

  @ApiProperty()
  stateTtlSeconds!: number;

  @ApiProperty({ type: [String] })
  securityChecks!: readonly string[];

  @ApiProperty({ type: [String] })
  accountBinding!: readonly string[];

  @ApiProperty()
  auditAction!: string;
}

export class IntegrationDesignDto {
  @ApiProperty()
  topic!: 'pay' | 'websocket' | 'wechat';

  @ApiProperty()
  status!: 'design-only';

  @ApiProperty({ type: [String] })
  boundaries!: readonly string[];

  @ApiProperty()
  documentPath!: string;
}

export class IntegrationDesignSummaryDto {
  @ApiProperty()
  designOnlyTopics!: number;

  @ApiProperty({ type: [String] })
  topics!: readonly string[];
}

export class IntegrationSummaryDto {
  @ApiProperty({ type: IntegrationProviderSummaryDto })
  providers!: IntegrationProviderSummaryDto;

  @ApiProperty({ type: IntegrationOutboxSummaryDto })
  mailOutbox!: IntegrationOutboxSummaryDto;

  @ApiProperty({ type: IntegrationOutboxSummaryDto })
  smsOutbox!: IntegrationOutboxSummaryDto;

  @ApiProperty()
  oauthProviders!: number;

  @ApiProperty({ type: IntegrationDesignSummaryDto })
  designs!: IntegrationDesignSummaryDto;
}
