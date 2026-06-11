import {
  OPENFORGE_CONTRACT_PROTOCOL,
  OPENFORGE_TEMPLATE_VERSION,
} from '@opencore/contracts';

export * from '@opencore/generator-core';

export const OPENFORGE_CLI_COMMANDS = [
  'plan',
  'diff',
  'check',
  'apply',
  'rollback',
  'manifest',
  'doctor',
] as const;

export type OpenForgeCliCommand = (typeof OPENFORGE_CLI_COMMANDS)[number];

export type OpenForgeWorkspaceStatus = {
  packageName: '@opencore/openforge';
  projectName: 'openforge';
  templateVersion: typeof OPENFORGE_TEMPLATE_VERSION;
  protocol: typeof OPENFORGE_CONTRACT_PROTOCOL;
  noWrite: true;
};

export function getOpenForgeWorkspaceStatus(): OpenForgeWorkspaceStatus {
  return {
    packageName: '@opencore/openforge',
    projectName: 'openforge',
    templateVersion: OPENFORGE_TEMPLATE_VERSION,
    protocol: OPENFORGE_CONTRACT_PROTOCOL,
    noWrite: true,
  };
}
