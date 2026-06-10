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
