export const OPENAPI_CONTRACT_PROTOCOL = {
  stage: 'S3',
  status: 'protocol-only',
  sourceApplication: 'apps/api',
  documentPath: 'packages/contracts/openapi/opencore-api.json',
  exportCommand: 'pnpm openapi:export',
  driftCheckCommand: 'pnpm openapi:check',
  sdkGenerateCommand: 'pnpm sdk:generate',
  sdkPackage: '@opencore/sdk',
  ownerPackage: '@opencore/contracts',
} as const;

export type OpenApiContractProtocol = typeof OPENAPI_CONTRACT_PROTOCOL;
