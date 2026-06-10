import { getOpenForgeWorkspaceStatus, OPENFORGE_CLI_COMMANDS } from './index';

describe('@opencore/openforge workspace', () => {
  it('declares the read-only S9 workspace status', () => {
    expect(getOpenForgeWorkspaceStatus()).toMatchObject({
      packageName: '@opencore/openforge',
      projectName: 'openforge',
      templateVersion: 's9-openforge-mvp-v1',
      noWrite: true,
      protocol: {
        stage: 'S9',
        noWrite: true,
      },
    });
  });

  it('exposes the root CLI commands with explicit safe apply', () => {
    expect(OPENFORGE_CLI_COMMANDS).toEqual([
      'plan',
      'diff',
      'check',
      'apply',
      'rollback',
      'manifest',
    ]);
  });
});
