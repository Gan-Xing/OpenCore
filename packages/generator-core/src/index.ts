import {
  OPENFORGE_CONTRACT_PROTOCOL,
  OPENFORGE_TEMPLATE_VERSION,
} from '@opencore/contracts';

export type OpenForgeGeneratorCoreStatus = {
  packageName: '@opencore/generator-core';
  projectName: 'generator-core';
  templateVersion: typeof OPENFORGE_TEMPLATE_VERSION;
  protocol: typeof OPENFORGE_CONTRACT_PROTOCOL;
  noWrite: true;
};

export function getOpenForgeGeneratorCoreStatus(): OpenForgeGeneratorCoreStatus {
  return {
    packageName: '@opencore/generator-core',
    projectName: 'generator-core',
    templateVersion: OPENFORGE_TEMPLATE_VERSION,
    protocol: OPENFORGE_CONTRACT_PROTOCOL,
    noWrite: true,
  };
}

export * from './readers/openapi-reader';
export * from './readers/registry-reader';
export * from './readers/schema-loader';
export * from './apply/apply-writer';
export * from './config/generator-config';
export * from './hash/stable-hash';
export * from './diff/diff-plan';
export * from './doctor/openforge-doctor';
export * from './output/diff-output';
export * from './output/plan-output';
export * from './planner/generate-plan';
export * from './preflight/preflight-report';
export * from './render/render-template-pack';
export * from './rollback/rollback-engine';
export * from './schema/schema-v1';
export * from './templates/default-template-pack';
export * from './validators/manual-schema-validator';
export * from './vfs/virtual-file-system';
