import {
  OPENFORGE_CONTRACT_PROTOCOL,
  OPENFORGE_TEMPLATE_VERSION,
} from '@opencore/contracts';

export const OPENFORGE_CLI_COMMANDS = ['plan', 'diff', 'check'] as const;

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

export * from './readers/openapi-reader';
export * from './readers/registry-reader';
export * from './readers/schema-loader';
export * from './config/generator-config';
export * from './hash/stable-hash';
export * from './diff/diff-plan';
export * from './output/diff-output';
export * from './output/plan-output';
export * from './planner/generate-plan';
export * from './preflight/preflight-report';
export * from './render/render-template-pack';
export * from './schema/schema-v1';
export * from './templates/default-template-pack';
export * from './validators/manual-schema-validator';
export * from './vfs/virtual-file-system';
