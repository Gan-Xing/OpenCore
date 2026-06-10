export type OpenApiDriftStatus = {
  status: 'configured';
  snapshotPath: string;
  exportCommand: string;
  driftCheckCommand: string;
  checkedAt: string;
};

export type CurrentPageExportProtocolSummary = {
  stage: 'S8';
  status: 'active';
  scope: 'current-page';
  supportedFormats: readonly ['csv'];
  maxRows: number;
  asyncExport: false;
  sensitiveFieldPolicy: string;
  ownerPackage: '@opencore/contracts';
};

export type CreateExportPreviewRequest = {
  resource: string;
  columns: readonly string[];
  rowCount: number;
};

export type ExportPlanSummary = {
  resource: string;
  filename: string;
  format: 'csv';
  scope: 'current-page';
  columns: readonly string[];
  rowCount: number;
  generatedAt: string;
};
