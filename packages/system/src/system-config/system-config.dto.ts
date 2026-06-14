import { ApiProperty } from '@nestjs/swagger';

export class SystemConfigDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  category!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  key!: string;

  @ApiProperty()
  value!: string;

  @ApiProperty({ enum: ['boolean', 'json', 'number', 'string'] })
  valueType!: 'boolean' | 'json' | 'number' | 'string';

  @ApiProperty()
  encrypted!: boolean;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  remark?: string;

  @ApiProperty()
  public!: boolean;

  @ApiProperty()
  system!: boolean;

  @ApiProperty({ enum: ['private', 'public', 'secret'] })
  visibility!: 'private' | 'public' | 'secret';
}

export class SystemConfigValueQueryDto {
  @ApiProperty({ example: 'opencore.admin.title' })
  key!: string;

  @ApiProperty({ required: false, example: 'staging' })
  environment?: string;
}

export class SystemConfigValueDto {
  @ApiProperty({ example: 'opencore.admin.title' })
  key!: string;

  @ApiProperty()
  value!: string;

  @ApiProperty({ enum: ['boolean', 'json', 'number', 'string'] })
  valueType!: 'boolean' | 'json' | 'number' | 'string';

  @ApiProperty({ example: 'default' })
  environment!: string;

  @ApiProperty()
  overridden!: boolean;
}

export class SystemConfigRuntimeQueryDto {
  @ApiProperty({ required: false, example: 'staging' })
  environment?: string;
}

export class SystemConfigRuntimeDto {
  @ApiProperty({ example: 'default' })
  environment!: string;

  @ApiProperty({ example: 'OpenCore Admin' })
  adminTitle!: string;

  @ApiProperty({
    additionalProperties: { type: 'boolean' },
    example: { 'notice.inbox': true },
  })
  featureFlags!: Record<string, boolean>;

  @ApiProperty({
    additionalProperties: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        rolloutPercentage: { type: 'number', minimum: 0, maximum: 100 },
        audienceRules: {
          type: 'object',
          properties: {
            mode: { type: 'string', enum: ['all', 'any'] },
            rules: { type: 'array', items: { type: 'object' } },
          },
        },
      },
      required: ['enabled', 'rolloutPercentage', 'audienceRules'],
    },
    example: {
      'notice.inbox': {
        enabled: true,
        rolloutPercentage: 100,
        audienceRules: { mode: 'all', rules: [] },
      },
    },
  })
  featureFlagRules!: Record<
    string,
    {
      audienceRules: {
        mode: 'all' | 'any';
        rules: readonly {
          attribute: string;
          operator: 'equals' | 'in' | 'not_equals' | 'not_in';
          values: readonly string[];
        }[];
      };
      enabled: boolean;
      rolloutPercentage: number;
    }
  >;

  @ApiProperty({ example: 15, minimum: 1, maximum: 1440 })
  loginLockoutMinutes!: number;

  @ApiProperty({ example: 5, minimum: 1, maximum: 20 })
  loginMaxFailedAttempts!: number;
}

export class SystemConfigFeatureFlagEvaluationQueryDto {
  @ApiProperty({ example: 'notice.inbox' })
  flag!: string;

  @ApiProperty({ example: 'user_admin' })
  subjectKey!: string;

  @ApiProperty({ required: false, example: 'staging' })
  environment?: string;

  @ApiProperty({
    required: false,
    example: '{"dept":"operations","role":"admin"}',
  })
  attributes?: string;
}

export class SystemConfigFeatureFlagEvaluationDto {
  @ApiProperty({ example: 'notice.inbox' })
  flag!: string;

  @ApiProperty({ example: 'default' })
  environment!: string;

  @ApiProperty({ example: 'user_admin' })
  subjectKey!: string;

  @ApiProperty()
  enabled!: boolean;

  @ApiProperty({ minimum: 0, maximum: 100 })
  rolloutPercentage!: number;

  @ApiProperty({ minimum: 0, maximum: 99 })
  bucket!: number;

  @ApiProperty()
  audienceMatched!: boolean;

  @ApiProperty({
    enum: [
      'audience-mismatch',
      'global-disabled',
      'matched-rollout',
      'outside-rollout',
    ],
  })
  reason!:
    | 'audience-mismatch'
    | 'global-disabled'
    | 'matched-rollout'
    | 'outside-rollout';
}

export class SystemConfigCacheRefreshDto {
  @ApiProperty()
  refreshed!: true;

  @ApiProperty()
  cachedKeys!: number;

  @ApiProperty()
  refreshedAt!: string;
}

export class BatchDeleteSystemConfigsDto {
  @ApiProperty({ type: [String] })
  keys!: readonly string[];
}

export class SystemConfigBatchMutationResultDto {
  @ApiProperty()
  deleted!: true;

  @ApiProperty()
  affected!: number;

  @ApiProperty({ type: [String] })
  keys!: readonly string[];
}

export class SystemConfigPageDto {
  @ApiProperty({ type: [SystemConfigDto] })
  items!: readonly SystemConfigDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class SystemConfigEnvironmentOverrideDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  key!: string;

  @ApiProperty({ example: 'staging' })
  environment!: string;

  @ApiProperty()
  value!: string;

  @ApiProperty({ enum: ['boolean', 'json', 'number', 'string'] })
  valueType!: 'boolean' | 'json' | 'number' | 'string';

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  remark?: string;

  @ApiProperty()
  public!: true;

  @ApiProperty({ enum: ['public'] })
  visibility!: 'public';

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class SystemConfigSecretVersionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  key!: string;

  @ApiProperty()
  version!: number;

  @ApiProperty()
  active!: boolean;

  @ApiProperty()
  encrypted!: true;

  @ApiProperty({ enum: ['v1', 'v2'] })
  envelopeVersion!: 'v1' | 'v2';

  @ApiProperty({ required: false })
  vaultKeyId?: string;

  @ApiProperty()
  activeVaultKey!: boolean;

  @ApiProperty({ required: false })
  rotatedBy?: string;

  @ApiProperty({ required: false })
  reason?: string;

  @ApiProperty()
  createdAt!: string;
}

export class SystemConfigVaultStatusDto {
  @ApiProperty({ enum: ['env'] })
  provider!: 'env';

  @ApiProperty()
  activeKeyId!: string;

  @ApiProperty({ type: [String] })
  keyIds!: readonly string[];

  @ApiProperty()
  legacyDecryptEnabled!: boolean;

  @ApiProperty()
  encryptedConfigCount!: number;

  @ApiProperty()
  secretVersionCount!: number;

  @ApiProperty()
  activeKeyConfigCount!: number;

  @ApiProperty()
  legacyEnvelopeCount!: number;

  @ApiProperty()
  staleKeyEnvelopeCount!: number;
}

export class SystemConfigVaultKeyRotationDto extends SystemConfigVaultStatusDto {
  @ApiProperty()
  rotatedAt!: string;

  @ApiProperty({ required: false })
  rotatedBy?: string;

  @ApiProperty({ required: false })
  reason?: string;

  @ApiProperty()
  rewrappedConfigCount!: number;

  @ApiProperty()
  rewrappedSecretVersionCount!: number;
}

export class CreateSystemConfigDto {
  @ApiProperty({ required: false, example: 'system' })
  category?: string;

  @ApiProperty({ required: false, example: 'Admin title' })
  name?: string;

  @ApiProperty({ example: 'opencore.admin.title' })
  key!: string;

  @ApiProperty()
  value!: string;

  @ApiProperty({ enum: ['boolean', 'json', 'number', 'string'] })
  valueType!: 'boolean' | 'json' | 'number' | 'string';

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  remark?: string;

  @ApiProperty({ required: false, default: false })
  public?: boolean;

  @ApiProperty({ required: false, enum: ['private', 'public', 'secret'] })
  visibility?: 'private' | 'public' | 'secret';
}

export class UpdateSystemConfigDto {
  @ApiProperty({ required: false })
  category?: string;

  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({ required: false })
  value?: string;

  @ApiProperty({
    required: false,
    enum: ['boolean', 'json', 'number', 'string'],
  })
  valueType?: 'boolean' | 'json' | 'number' | 'string';

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  remark?: string;

  @ApiProperty({ required: false })
  public?: boolean;

  @ApiProperty({ required: false, enum: ['private', 'public', 'secret'] })
  visibility?: 'private' | 'public' | 'secret';
}

export class UpsertSystemConfigEnvironmentOverrideDto {
  @ApiProperty()
  value!: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  remark?: string;
}

export class RotateSystemConfigSecretDto {
  @ApiProperty()
  value!: string;

  @ApiProperty({ required: false, example: 'admin' })
  rotatedBy?: string;

  @ApiProperty({ required: false })
  reason?: string;
}

export class RotateSystemConfigVaultKeyDto {
  @ApiProperty({ required: false, example: 'admin' })
  rotatedBy?: string;

  @ApiProperty({ required: false })
  reason?: string;
}
