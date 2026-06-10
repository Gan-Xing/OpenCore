import {
  CURRENT_PAGE_EXPORT_PROTOCOL,
  createCurrentPageExportPlan,
} from '@opencore/contracts';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ToolingRepository {
  getOpenApiDriftStatus() {
    return {
      status: 'configured' as const,
      snapshotPath: 'packages/contracts/openapi/opencore-api.json',
      exportCommand: 'pnpm openapi:export',
      driftCheckCommand: 'pnpm openapi:check',
      checkedAt: new Date().toISOString(),
    };
  }

  getExportProtocol() {
    return CURRENT_PAGE_EXPORT_PROTOCOL;
  }

  createExportPlan(input: {
    resource: string;
    columns: readonly string[];
    rowCount: number;
  }) {
    return createCurrentPageExportPlan(input);
  }
}
