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

export type IntegrationProviderSecretRefStatus =
  | 'invalid'
  | 'missing'
  | 'unchecked'
  | 'unsupported'
  | 'valid';

export type IntegrationProviderTestStatus =
  | 'failed'
  | 'not_run'
  | 'passed'
  | 'warning';

export type IntegrationProviderAuditAction =
  | 'created'
  | 'disabled'
  | 'enabled'
  | 'health_checked'
  | 'tested'
  | 'updated';

export class IntegrationProviderDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

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

  @ApiProperty({
    enum: ['invalid', 'missing', 'unchecked', 'unsupported', 'valid'],
  })
  secretRefStatus!: IntegrationProviderSecretRefStatus;

  @ApiProperty()
  configVersion!: number;

  @ApiProperty({
    additionalProperties: true,
    example: {
      adapter: 'smtp',
      host: 'smtp.example.test',
      tlsMode: 'starttls-required',
    },
  })
  config!: Record<string, unknown>;

  @ApiProperty({ enum: ['unknown', 'healthy', 'degraded', 'disabled'] })
  healthStatus!: 'unknown' | 'healthy' | 'degraded' | 'disabled';

  @ApiProperty({ required: false })
  lastCheckedAt?: string;

  @ApiProperty({
    enum: ['failed', 'not_run', 'passed', 'warning'],
    required: false,
  })
  lastTestStatus?: IntegrationProviderTestStatus;

  @ApiProperty({ required: false })
  lastTestMessage?: string;

  @ApiProperty({ required: false })
  lastTestedAt?: string;
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

export class IntegrationProviderDiagnosticCheckDto {
  @ApiProperty()
  code!: string;

  @ApiProperty({ enum: ['pass', 'warn', 'fail'] })
  status!: 'pass' | 'warn' | 'fail';

  @ApiProperty()
  message!: string;
}

export class IntegrationProviderDiagnosticLastFailureDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ required: false })
  error?: string;

  @ApiProperty()
  retryCount!: number;

  @ApiProperty()
  createdAt!: string;
}

export class IntegrationProviderDiagnosticOutboxDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  queued!: number;

  @ApiProperty()
  sent!: number;

  @ApiProperty()
  failed!: number;

  @ApiProperty()
  retryableFailed!: number;

  @ApiProperty({
    type: IntegrationProviderDiagnosticLastFailureDto,
    required: false,
  })
  lastFailure?: IntegrationProviderDiagnosticLastFailureDto;
}

export class IntegrationProviderDiagnosticsDto {
  @ApiProperty({ type: IntegrationProviderDto })
  provider!: IntegrationProviderDto;

  @ApiProperty({ enum: ['mail', 'sms'], required: false })
  channel?: 'mail' | 'sms';

  @ApiProperty({ enum: ['ready', 'attention', 'blocked', 'unsupported'] })
  readiness!: 'ready' | 'attention' | 'blocked' | 'unsupported';

  @ApiProperty({ type: IntegrationProviderDiagnosticOutboxDto })
  outbox!: IntegrationProviderDiagnosticOutboxDto;

  @ApiProperty({ type: [IntegrationProviderDiagnosticCheckDto] })
  checks!: readonly IntegrationProviderDiagnosticCheckDto[];

  @ApiProperty({ type: [String] })
  actions!: readonly string[];

  @ApiProperty()
  generatedAt!: string;
}

export class IntegrationProviderHealthAuditTotalsDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  ready!: number;

  @ApiProperty()
  attention!: number;

  @ApiProperty()
  blocked!: number;

  @ApiProperty()
  unsupported!: number;

  @ApiProperty()
  queued!: number;

  @ApiProperty()
  failed!: number;

  @ApiProperty()
  retryableFailed!: number;

  @ApiProperty()
  unchecked!: number;

  @ApiProperty()
  configVaultBacked!: number;

  @ApiProperty()
  configVaultMissing!: number;
}

export class IntegrationProviderHealthAuditDto {
  @ApiProperty()
  generatedAt!: string;

  @ApiProperty({ type: IntegrationProviderHealthAuditTotalsDto })
  totals!: IntegrationProviderHealthAuditTotalsDto;

  @ApiProperty({ type: [IntegrationProviderDiagnosticsDto] })
  providers!: readonly IntegrationProviderDiagnosticsDto[];

  @ApiProperty({ type: [String] })
  actions!: readonly string[];
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

  @ApiProperty({
    additionalProperties: true,
    example: {
      adapter: 'smtp',
      host: 'smtp.example.test',
      tlsMode: 'starttls-required',
    },
  })
  config!: Record<string, unknown>;
}

export class UpdateIntegrationProviderDto {
  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({ required: false })
  enabled?: boolean;

  @ApiProperty({ required: false })
  secretRef?: string;

  @ApiProperty({
    additionalProperties: true,
    example: {
      adapter: 'smtp',
      host: 'smtp.example.test',
      tlsMode: 'starttls-required',
    },
    required: false,
  })
  config?: Record<string, unknown>;
}

export class TestIntegrationProviderDto {
  @ApiProperty({ required: false })
  reason?: string;
}

export class IntegrationProviderTestResultDto {
  @ApiProperty({ type: IntegrationProviderDto })
  provider!: IntegrationProviderDto;

  @ApiProperty({ enum: ['failed', 'not_run', 'passed', 'warning'] })
  status!: IntegrationProviderTestStatus;

  @ApiProperty({
    enum: ['invalid', 'missing', 'unchecked', 'unsupported', 'valid'],
  })
  secretRefStatus!: IntegrationProviderSecretRefStatus;

  @ApiProperty()
  message!: string;

  @ApiProperty()
  testedAt!: string;
}

export class IntegrationProviderAuditLogDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  providerCode!: string;

  @ApiProperty({
    enum: [
      'created',
      'disabled',
      'enabled',
      'health_checked',
      'tested',
      'updated',
    ],
  })
  action!: IntegrationProviderAuditAction;

  @ApiProperty()
  actor!: string;

  @ApiProperty({ required: false })
  reason?: string;

  @ApiProperty({ required: false })
  beforeConfigVersion?: number;

  @ApiProperty({ required: false })
  afterConfigVersion?: number;

  @ApiProperty({
    enum: ['invalid', 'missing', 'unchecked', 'unsupported', 'valid'],
    required: false,
  })
  beforeSecretRefStatus?: IntegrationProviderSecretRefStatus;

  @ApiProperty({
    enum: ['invalid', 'missing', 'unchecked', 'unsupported', 'valid'],
    required: false,
  })
  afterSecretRefStatus?: IntegrationProviderSecretRefStatus;

  @ApiProperty({
    enum: ['failed', 'not_run', 'passed', 'warning'],
    required: false,
  })
  testStatus?: IntegrationProviderTestStatus;

  @ApiProperty({ required: false })
  message?: string;

  @ApiProperty({ additionalProperties: true, required: false })
  summary?: Record<string, unknown>;

  @ApiProperty()
  createdAt!: string;
}

export class IntegrationProviderAuditLogPageDto {
  @ApiProperty({ type: [IntegrationProviderAuditLogDto] })
  items!: readonly IntegrationProviderAuditLogDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class IntegrationTemplateDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

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

export class IntegrationOutboxAttachmentDto {
  @ApiProperty()
  filename!: string;

  @ApiProperty()
  contentType!: string;

  @ApiProperty()
  contentBase64!: string;

  @ApiProperty()
  sizeBytes!: number;
}

export class CreateIntegrationOutboxAttachmentDto {
  @ApiProperty()
  filename!: string;

  @ApiProperty()
  contentType!: string;

  @ApiProperty()
  contentBase64!: string;
}

export class IntegrationOutboxDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty({ enum: ['mail', 'sms'] })
  channel!: 'mail' | 'sms';

  @ApiProperty()
  providerCode!: string;

  @ApiProperty({ required: false })
  templateCode?: string;

  @ApiProperty()
  recipient!: string;

  @ApiProperty({ required: false })
  subject?: string;

  @ApiProperty()
  payload!: Record<string, unknown>;

  @ApiProperty({ type: [IntegrationOutboxAttachmentDto], required: false })
  attachments?: readonly IntegrationOutboxAttachmentDto[];

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

  @ApiProperty({ required: false })
  subject?: string;

  @ApiProperty()
  payload!: Record<string, unknown>;

  @ApiProperty({
    type: [CreateIntegrationOutboxAttachmentDto],
    required: false,
  })
  attachments?: readonly CreateIntegrationOutboxAttachmentDto[];
}

export class TestOutboxMessageDto extends CreateOutboxMessageDto {
  @ApiProperty({
    required: false,
    description:
      'Optional operator reason recorded in the test-send result context.',
  })
  reason?: string;
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

export class ScheduleOutboxDto {
  @ApiProperty({
    enum: ['mail', 'sms'],
    isArray: true,
    required: false,
    description: 'Channels included in the retry schedule run.',
  })
  channels?: readonly ('mail' | 'sms')[] | 'mail' | 'sms';

  @ApiProperty({ required: false })
  providerCode?: string;

  @ApiProperty({ required: false, default: 100 })
  limit?: number;

  @ApiProperty({ required: false, default: true })
  retryFailed?: boolean;

  @ApiProperty({ required: false, default: 3 })
  maxRetryCount?: number;
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
  failedCount!: number;

  @ApiProperty()
  skippedCount!: number;

  @ApiProperty()
  queuedCount!: number;
}

export class IntegrationOutboxTestResultDto {
  @ApiProperty({ enum: ['mail', 'sms'] })
  channel!: 'mail' | 'sms';

  @ApiProperty()
  providerCode!: string;

  @ApiProperty({ type: IntegrationOutboxDto })
  message!: IntegrationOutboxDto;

  @ApiProperty({ enum: ['failed', 'sent'] })
  status!: 'failed' | 'sent';

  @ApiProperty({ required: false })
  error?: string;

  @ApiProperty()
  testedAt!: string;
}

export class IntegrationOutboxScheduleChannelResultDto {
  @ApiProperty({ enum: ['mail', 'sms'] })
  channel!: 'mail' | 'sms';

  @ApiProperty({ required: false })
  providerCode?: string;

  @ApiProperty()
  retriedCount!: number;

  @ApiProperty({ type: IntegrationOutboxProcessResultDto })
  process!: IntegrationOutboxProcessResultDto;
}

export class IntegrationOutboxScheduleResultDto {
  @ApiProperty()
  retryFailed!: boolean;

  @ApiProperty()
  maxRetryCount!: number;

  @ApiProperty({ type: [IntegrationOutboxScheduleChannelResultDto] })
  channels!: readonly IntegrationOutboxScheduleChannelResultDto[];

  @ApiProperty()
  retriedCount!: number;

  @ApiProperty()
  attemptedCount!: number;

  @ApiProperty()
  sentCount!: number;

  @ApiProperty()
  failedCount!: number;

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

export type OAuthFlowStatus = 'completed' | 'expired' | 'failed' | 'pending';
export type OAuthCallbackAuditStatus = 'accepted' | 'rejected';
export type OAuthProfileBindingStatus = 'ready' | 'requires_configuration';
export type OAuthProfileBindingIssue =
  | 'disabled'
  | 'missing_config'
  | 'placeholder_client'
  | 'secret_unverified';

export class StartOAuthFlowDto {
  @ApiProperty()
  providerCode!: string;

  @ApiProperty({ required: false })
  subjectType?: string;

  @ApiProperty()
  subjectId!: string;

  @ApiProperty({ type: [String], required: false })
  scopes?: readonly string[];

  @ApiProperty({ required: false })
  redirectUri?: string;
}

export class StartOAuthProfileFlowDto {
  @ApiProperty()
  providerCode!: string;

  @ApiProperty({ required: false })
  redirectUri?: string;
}

export class OAuthProfileProviderDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: ['oauth'] })
  type!: 'oauth';

  @ApiProperty({ enum: ['ready', 'requires_configuration'] })
  bindingStatus!: OAuthProfileBindingStatus;

  @ApiProperty({
    enum: [
      'disabled',
      'missing_config',
      'placeholder_client',
      'secret_unverified',
    ],
    required: false,
  })
  bindingIssue?: OAuthProfileBindingIssue;
}

export class OAuthFlowDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  providerCode!: string;

  @ApiProperty()
  state!: string;

  @ApiProperty()
  subjectType!: string;

  @ApiProperty()
  subjectId!: string;

  @ApiProperty({ type: [String] })
  scopes!: readonly string[];

  @ApiProperty({ required: false })
  redirectUri?: string;

  @ApiProperty()
  authorizationUrl!: string;

  @ApiProperty({ enum: ['completed', 'expired', 'failed', 'pending'] })
  status!: OAuthFlowStatus;

  @ApiProperty()
  expiresAt!: string;

  @ApiProperty({ required: false })
  callbackCodeHash?: string;

  @ApiProperty({ required: false })
  callbackError?: string;

  @ApiProperty({ required: false })
  tokenId?: string;

  @ApiProperty({ required: false })
  completedAt?: string;

  @ApiProperty()
  createdAt!: string;
}

export class OAuthFlowPageDto {
  @ApiProperty({ type: [OAuthFlowDto] })
  items!: readonly OAuthFlowDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class OAuthFlowQueryDto extends PageQueryDto {
  @ApiProperty({ required: false })
  providerCode?: string;

  @ApiProperty({ required: false })
  subjectId?: string;

  @ApiProperty({
    enum: ['completed', 'expired', 'failed', 'pending'],
    required: false,
  })
  status?: OAuthFlowStatus;
}

export class OAuthProviderCallbackDto {
  @ApiProperty()
  state!: string;

  @ApiProperty({ enum: ['json', 'redirect'], required: false })
  response?: 'json' | 'redirect';

  @ApiProperty({ required: false })
  code?: string;

  @ApiProperty({ required: false })
  error?: string;

  @ApiProperty({ required: false })
  providerAccountId?: string;

  @ApiProperty({ required: false })
  scopes?: string;

  @ApiProperty({ required: false })
  expiresInSeconds?: number | null;
}

export class OAuthCallbackAuditDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  providerCode!: string;

  @ApiProperty({ required: false })
  flowId?: string;

  @ApiProperty()
  state!: string;

  @ApiProperty({ enum: ['accepted', 'rejected'] })
  status!: OAuthCallbackAuditStatus;

  @ApiProperty({ required: false })
  reason?: string;

  @ApiProperty({ required: false })
  callbackCodeHash?: string;

  @ApiProperty({ required: false })
  callbackError?: string;

  @ApiProperty({ required: false })
  providerAccountId?: string;

  @ApiProperty({ required: false })
  tokenId?: string;

  @ApiProperty()
  createdAt!: string;
}

export class OAuthCallbackAuditPageDto {
  @ApiProperty({ type: [OAuthCallbackAuditDto] })
  items!: readonly OAuthCallbackAuditDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class OAuthCallbackAuditQueryDto extends PageQueryDto {
  @ApiProperty({ required: false })
  providerCode?: string;

  @ApiProperty({
    enum: ['accepted', 'rejected'],
    required: false,
  })
  status?: OAuthCallbackAuditStatus;
}

export type OAuthTokenStatus = 'active' | 'expired' | 'revoked';

export class OAuthTokenDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  providerCode!: string;

  @ApiProperty()
  subjectType!: string;

  @ApiProperty()
  subjectId!: string;

  @ApiProperty()
  providerAccountId!: string;

  @ApiProperty({ type: [String] })
  scopes!: readonly string[];

  @ApiProperty()
  accessTokenRef!: string;

  @ApiProperty({ required: false })
  refreshTokenRef?: string;

  @ApiProperty({ enum: ['active', 'expired', 'revoked'] })
  status!: OAuthTokenStatus;

  @ApiProperty({ required: false })
  expiresAt?: string;

  @ApiProperty({ required: false })
  lastRotatedAt?: string;

  @ApiProperty({ required: false })
  revokedAt?: string;

  @ApiProperty({ required: false })
  revokedBy?: string;

  @ApiProperty({ required: false })
  revokeReason?: string;

  @ApiProperty()
  createdAt!: string;
}

export class OAuthTokenPageDto {
  @ApiProperty({ type: [OAuthTokenDto] })
  items!: readonly OAuthTokenDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class OAuthTokenQueryDto extends PageQueryDto {
  @ApiProperty({ required: false })
  providerCode?: string;

  @ApiProperty({ required: false })
  subjectId?: string;

  @ApiProperty({ enum: ['active', 'expired', 'revoked'], required: false })
  status?: OAuthTokenStatus;
}

export class OAuthTokenInventorySummaryDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  active!: number;

  @ApiProperty()
  expired!: number;

  @ApiProperty()
  revoked!: number;

  @ApiProperty()
  expiringSoon!: number;

  @ApiProperty()
  providers!: number;

  @ApiProperty()
  generatedAt!: string;
}

export class RevokeOAuthTokenDto {
  @ApiProperty({ required: false })
  reason?: string;
}

export class OAuthProfileAccountDto {
  @ApiProperty()
  tokenId!: string;

  @ApiProperty()
  providerCode!: string;

  @ApiProperty()
  providerName!: string;

  @ApiProperty()
  providerAccountId!: string;

  @ApiProperty({ type: [String] })
  scopes!: readonly string[];

  @ApiProperty({ enum: ['active', 'expired', 'revoked'] })
  status!: OAuthTokenStatus;

  @ApiProperty({ required: false })
  expiresAt?: string;

  @ApiProperty({ required: false })
  lastRotatedAt?: string;

  @ApiProperty({ required: false })
  revokedAt?: string;

  @ApiProperty({ required: false })
  revokeReason?: string;

  @ApiProperty()
  createdAt!: string;
}

export class UnbindOAuthProfileAccountDto {
  @ApiProperty({ required: false })
  reason?: string;
}

export class OAuthCallbackResultDto {
  @ApiProperty()
  providerCode!: string;

  @ApiProperty({ required: false })
  flowId?: string;

  @ApiProperty({ required: false })
  subjectType?: string;

  @ApiProperty()
  state!: string;

  @ApiProperty({ enum: ['accepted', 'rejected'] })
  status!: OAuthCallbackAuditStatus;

  @ApiProperty()
  message!: string;

  @ApiProperty({ type: OAuthCallbackAuditDto })
  audit!: OAuthCallbackAuditDto;

  @ApiProperty({ type: OAuthTokenDto, required: false })
  token?: OAuthTokenDto;

  @ApiProperty({ required: false })
  completedAt?: string;
}

export type WebSocketRuntimeConnectionStatus = 'closed' | 'connected';
export type WebSocketRuntimeSubscriptionStatus = 'active' | 'closed';
export type WebSocketRuntimeEventDeliveryStatus =
  | 'delivered'
  | 'no_subscribers';

export class WebSocketRuntimeConnectionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  subjectId!: string;

  @ApiProperty({ enum: ['sse'] })
  transport!: 'sse';

  @ApiProperty({ enum: ['closed', 'connected'] })
  status!: WebSocketRuntimeConnectionStatus;

  @ApiProperty({ type: [String] })
  rooms!: readonly string[];

  @ApiProperty()
  connectedAt!: string;

  @ApiProperty()
  lastSeenAt!: string;

  @ApiProperty({ required: false })
  closedAt?: string;

  @ApiProperty({ required: false })
  closeReason?: string;
}

export class WebSocketRuntimeSubscriptionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  connectionId!: string;

  @ApiProperty()
  room!: string;

  @ApiProperty({ type: [String] })
  eventTypes!: readonly string[];

  @ApiProperty({ enum: ['active', 'closed'] })
  status!: WebSocketRuntimeSubscriptionStatus;

  @ApiProperty()
  subscribedAt!: string;

  @ApiProperty({ required: false })
  closedAt?: string;
}

export class WebSocketRuntimeEventDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  room!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  payloadPreview!: Record<string, unknown>;

  @ApiProperty({ required: false })
  traceId?: string;

  @ApiProperty()
  deliveredCount!: number;

  @ApiProperty({ enum: ['delivered', 'no_subscribers'] })
  status!: WebSocketRuntimeEventDeliveryStatus;

  @ApiProperty()
  createdAt!: string;
}

export class WebSocketRuntimeSummaryDto {
  @ApiProperty()
  activeConnections!: number;

  @ApiProperty()
  totalConnections!: number;

  @ApiProperty()
  activeSubscriptions!: number;

  @ApiProperty()
  recentEvents!: number;

  @ApiProperty({ required: false })
  lastEventAt?: string;

  @ApiProperty()
  generatedAt!: string;
}

export class WebSocketRuntimeDiagnosticsDto {
  @ApiProperty({ type: WebSocketRuntimeSummaryDto })
  summary!: WebSocketRuntimeSummaryDto;

  @ApiProperty({ type: [WebSocketRuntimeConnectionDto] })
  connections!: readonly WebSocketRuntimeConnectionDto[];

  @ApiProperty({ type: [WebSocketRuntimeSubscriptionDto] })
  subscriptions!: readonly WebSocketRuntimeSubscriptionDto[];

  @ApiProperty({ type: [WebSocketRuntimeEventDto] })
  events!: readonly WebSocketRuntimeEventDto[];
}

export class WebSocketRuntimeStreamQueryDto {
  @ApiProperty({ required: false })
  room?: string;

  @ApiProperty({ required: false })
  eventTypes?: string;
}

export class PublishWebSocketRuntimeEventDto {
  @ApiProperty({ required: false })
  room?: string;

  @ApiProperty()
  type!: string;

  @ApiProperty({ required: false })
  payload?: Record<string, unknown>;

  @ApiProperty({ required: false })
  traceId?: string;
}

export class IntegrationDesignDto {
  @ApiProperty()
  topic!: 'pay' | 'websocket' | 'wechat';

  @ApiProperty({ enum: ['design-only', 'runtime-active'] })
  status!: 'design-only' | 'runtime-active';

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

  @ApiProperty({ type: OAuthTokenInventorySummaryDto })
  oauthTokens!: OAuthTokenInventorySummaryDto;

  @ApiProperty({ type: IntegrationDesignSummaryDto })
  designs!: IntegrationDesignSummaryDto;
}
