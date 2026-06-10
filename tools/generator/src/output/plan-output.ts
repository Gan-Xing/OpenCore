import type { OpenForgePlan } from '@opencore/contracts';

export function formatPlanAsJson(plan: OpenForgePlan): string {
  return `${JSON.stringify(plan, null, 2)}\n`;
}

export function formatPlanAsMarkdown(plan: OpenForgePlan): string {
  const lines = [
    `# OpenForge Generate Plan: ${plan.moduleCode}`,
    '',
    `Template: \`${plan.templateVersion}\``,
    `Schema hash: \`${plan.schemaHash}\``,
    `Registry hash: \`${plan.registrySnapshotHash}\``,
    `OpenAPI hash: \`${plan.openApiSnapshotHash}\``,
    '',
    '## Safety',
    '',
    `- No write: ${plan.safety.noWrite}`,
    `- Dry run only: ${plan.safety.dryRunOnly}`,
    `- Prisma schema writes blocked: ${plan.safety.blockPrismaSchemaWrites}`,
    '',
    '## Artifacts',
    '',
    ...plan.artifacts.map(
      (artifact) =>
        `- \`${artifact.kind}\` ${artifact.action} \`${artifact.targetPath}\`: ${artifact.reason}`,
    ),
    '',
    '## Next Commands',
    '',
    ...plan.nextCommands.map((command) => `- \`${command}\``),
    '',
  ];

  if (plan.errors.length > 0) {
    lines.push('## Errors', '');
    lines.push(
      ...plan.errors.map((issue) => `- \`${issue.path}\`: ${issue.message}`),
      '',
    );
  }

  if (plan.warnings.length > 0) {
    lines.push('## Warnings', '');
    lines.push(
      ...plan.warnings.map((issue) => `- \`${issue.path}\`: ${issue.message}`),
      '',
    );
  }

  return `${lines.join('\n')}\n`;
}
