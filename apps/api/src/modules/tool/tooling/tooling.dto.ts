import { ApiProperty } from '@nestjs/swagger';

export class OpenApiDriftStatusDto {
  @ApiProperty({ enum: ['configured'] })
  status!: 'configured';

  @ApiProperty()
  snapshotPath!: string;

  @ApiProperty()
  exportCommand!: string;

  @ApiProperty()
  driftCheckCommand!: string;

  @ApiProperty()
  checkedAt!: string;
}

export class CurrentPageExportProtocolDto {
  @ApiProperty()
  stage!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  scope!: string;

  @ApiProperty({ type: [String] })
  supportedFormats!: readonly string[];

  @ApiProperty()
  maxRows!: number;

  @ApiProperty()
  asyncExport!: false;

  @ApiProperty()
  sensitiveFieldPolicy!: string;

  @ApiProperty()
  ownerPackage!: string;
}

export class CreateExportPreviewDto {
  @ApiProperty({ example: 'dicts' })
  resource!: string;

  @ApiProperty({ type: [String] })
  columns!: readonly string[];

  @ApiProperty()
  rowCount!: number;
}

export class ExportPlanDto {
  @ApiProperty()
  resource!: string;

  @ApiProperty()
  filename!: string;

  @ApiProperty()
  format!: 'csv';

  @ApiProperty()
  scope!: 'current-page';

  @ApiProperty({ type: [String] })
  columns!: readonly string[];

  @ApiProperty()
  rowCount!: number;

  @ApiProperty()
  generatedAt!: string;
}

export class OpenForgeSchemaRequestDto {
  @ApiProperty({
    default: 'tools/generator/examples/core.dict.v1.schema.json',
  })
  schemaPath!: string;
}

export class OpenForgeApplyDryRunRequestDto extends OpenForgeSchemaRequestDto {
  @ApiProperty({
    required: false,
    default: 'tools/generator/examples/openforge.v1.config.json',
  })
  configPath?: string;

  @ApiProperty({ required: false, enum: ['dry-run', 'write'] })
  requestedMode?: 'dry-run' | 'write';

  @ApiProperty({
    default: 'OPENFORGE DRY RUN',
    description: 'Required confirmation text for Admin-triggered dry-runs.',
  })
  confirmationText!: string;
}

export class OpenForgeManifestPreviewRequestDto extends OpenForgeSchemaRequestDto {
  @ApiProperty({
    required: false,
    default: 'tools/generator/examples/openforge.v1.config.json',
  })
  configPath?: string;
}

export class OpenForgeRollbackDryRunRequestDto {
  @ApiProperty({
    description: 'Manifest id returned by the OpenForge manifest list.',
  })
  manifestId!: string;

  @ApiProperty({ required: false, enum: ['dry-run', 'write'] })
  requestedMode?: 'dry-run' | 'write';

  @ApiProperty({
    default: 'OPENFORGE DRY RUN',
    description: 'Required confirmation text for Admin-triggered dry-runs.',
  })
  confirmationText!: string;
}

export class OpenForgeStatusDto {
  @ApiProperty({ enum: ['workspace-ready'] })
  status!: 'workspace-ready';

  @ApiProperty()
  message!: string;

  @ApiProperty({ type: Object })
  workspace!: object;

  @ApiProperty({ type: Object })
  generatorCore!: object;

  @ApiProperty({ type: Object })
  operationPolicy!: object;
}

export class OpenForgeDoctorDto {
  @ApiProperty()
  generatedAt!: string;

  @ApiProperty()
  repoRoot!: string;

  @ApiProperty()
  valid!: boolean;

  @ApiProperty({ type: [Object] })
  checks!: readonly object[];

  @ApiProperty({ type: [Object] })
  errors!: readonly object[];
}

export class OpenForgePlanDto {
  @ApiProperty()
  moduleCode!: string;

  @ApiProperty()
  templateVersion!: string;

  @ApiProperty({ type: [Object] })
  artifacts!: readonly object[];

  @ApiProperty({ type: [String] })
  permissions!: readonly string[];

  @ApiProperty({ type: [String] })
  openapiTags!: readonly string[];

  @ApiProperty({ type: [Object] })
  warnings!: readonly object[];

  @ApiProperty({ type: [Object] })
  errors!: readonly object[];

  @ApiProperty({ type: Object })
  safety!: object;
}

export class OpenForgeDiffDto {
  @ApiProperty()
  moduleCode!: string;

  @ApiProperty()
  templateVersion!: string;

  @ApiProperty()
  generatedAt!: string;

  @ApiProperty({ type: [Object] })
  entries!: readonly object[];

  @ApiProperty({ type: [Object] })
  warnings!: readonly object[];

  @ApiProperty({ type: [Object] })
  errors!: readonly object[];

  @ApiProperty({ type: Object })
  safety!: object;
}

export class OpenForgePreflightDto {
  @ApiProperty()
  templateVersion!: string;

  @ApiProperty()
  generatedAt!: string;

  @ApiProperty()
  schemaPath!: string;

  @ApiProperty()
  moduleCode!: string;

  @ApiProperty()
  valid!: boolean;

  @ApiProperty()
  noWrite!: true;

  @ApiProperty({ type: Object })
  registry!: object;

  @ApiProperty({ type: Object })
  openApi!: object;

  @ApiProperty({ type: Object })
  safety!: object;

  @ApiProperty({ type: [Object] })
  warnings!: readonly object[];

  @ApiProperty({ type: [Object] })
  errors!: readonly object[];
}

export class OpenForgeManifestListDto {
  @ApiProperty({ type: [Object] })
  manifests!: readonly object[];

  @ApiProperty({ type: [Object] })
  warnings!: readonly object[];

  @ApiProperty({ type: [Object] })
  errors!: readonly object[];
}

export class OpenForgeManifestDetailDto {
  @ApiProperty()
  manifestPath!: string;

  @ApiProperty({ type: Object, required: false })
  manifest?: object;

  @ApiProperty({ type: [Object] })
  warnings!: readonly object[];

  @ApiProperty({ type: [Object] })
  errors!: readonly object[];
}

export class OpenForgeApplyDryRunDto {
  @ApiProperty({ enum: ['dry-run'] })
  mode!: 'dry-run';

  @ApiProperty()
  applied!: boolean;

  @ApiProperty({ type: Object, required: false })
  manifest?: object;

  @ApiProperty({ type: [Object] })
  entries!: readonly object[];

  @ApiProperty({ type: [Object] })
  warnings!: readonly object[];

  @ApiProperty({ type: [Object] })
  errors!: readonly object[];
}

export class OpenForgeRollbackDryRunDto {
  @ApiProperty({ enum: ['dry-run'] })
  mode!: 'dry-run';

  @ApiProperty()
  rolledBack!: boolean;

  @ApiProperty({ type: Object, required: false })
  manifest?: object;

  @ApiProperty({ type: [Object] })
  entries!: readonly object[];

  @ApiProperty({ type: [Object] })
  warnings!: readonly object[];

  @ApiProperty({ type: [Object] })
  errors!: readonly object[];
}
