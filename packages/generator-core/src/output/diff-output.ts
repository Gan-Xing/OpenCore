import type {
  OpenForgeDiffPlan,
  OpenForgePreflightReport,
} from '@opencore/contracts';

export function formatDiffPlanAsJson(diffPlan: OpenForgeDiffPlan): string {
  return `${JSON.stringify(diffPlan, null, 2)}\n`;
}

export function formatPreflightReportAsJson(
  report: OpenForgePreflightReport,
): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}
