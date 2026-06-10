export const CURRENT_PAGE_EXPORT_PROTOCOL = {
  stage: 'S8',
  status: 'active',
  scope: 'current-page',
  supportedFormats: ['csv'],
  maxRows: 1000,
  asyncExport: false,
  sensitiveFieldPolicy: 'exclude-sensitive-fields-before-export',
  ownerPackage: '@opencore/contracts',
} as const;

export type CurrentPageExportProtocol = typeof CURRENT_PAGE_EXPORT_PROTOCOL;

export type CurrentPageExportPlan = {
  resource: string;
  filename: string;
  format: (typeof CURRENT_PAGE_EXPORT_PROTOCOL.supportedFormats)[number];
  scope: typeof CURRENT_PAGE_EXPORT_PROTOCOL.scope;
  columns: readonly string[];
  rowCount: number;
  generatedAt: string;
};

export function createCurrentPageExportPlan(input: {
  resource: string;
  columns: readonly string[];
  rowCount: number;
  generatedAt?: string;
}): CurrentPageExportPlan {
  return {
    resource: input.resource,
    filename: `opencore-${input.resource}.csv`,
    format: 'csv',
    scope: CURRENT_PAGE_EXPORT_PROTOCOL.scope,
    columns: input.columns,
    rowCount: Math.min(input.rowCount, CURRENT_PAGE_EXPORT_PROTOCOL.maxRows),
    generatedAt: input.generatedAt ?? new Date().toISOString(),
  };
}
