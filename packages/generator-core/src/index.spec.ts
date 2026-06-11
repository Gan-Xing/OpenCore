import { getOpenForgeGeneratorCoreStatus, renderTemplatePack } from './index';

describe('@opencore/generator-core workspace', () => {
  it('declares the extracted read-only generator core status', () => {
    expect(getOpenForgeGeneratorCoreStatus()).toMatchObject({
      packageName: '@opencore/generator-core',
      projectName: 'generator-core',
      templateVersion: 's9-openforge-mvp-v1',
      noWrite: true,
      protocol: {
        stage: 'S9',
        noWrite: true,
      },
    });
  });

  it('exposes the template rendering core through the package entrypoint', () => {
    expect(renderTemplatePack).toEqual(expect.any(Function));
  });
});
