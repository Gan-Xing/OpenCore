import { runCli } from './cli';

function createWritableBuffer() {
  let value = '';

  return {
    stream: {
      write(message: string) {
        value += message;
      },
    },
    getValue() {
      return value;
    },
  };
}

describe('OpenForge CLI shell', () => {
  it('prints help without writing generated files', () => {
    const stdout = createWritableBuffer();
    const stderr = createWritableBuffer();

    expect(runCli(['--help'], stdout.stream, stderr.stream)).toEqual({
      exitCode: 0,
    });
    expect(stdout.getValue()).toContain('OpenForge V1 safe generator tool');
    expect(stdout.getValue()).toContain('doctor');
    expect(stdout.getValue()).toContain('status');
    expect(stdout.getValue()).toContain(
      'Apply and rollback writes require explicit --yes',
    );
    expect(stderr.getValue()).toBe('');
  });

  it('prints the generate plan as JSON', () => {
    const stdout = createWritableBuffer();
    const stderr = createWritableBuffer();

    expect(
      runCli(
        [
          'plan',
          '--schema',
          'tools/generator/examples/core.dict.schema.json',
          '--format',
          'json',
        ],
        stdout.stream,
        stderr.stream,
      ),
    ).toEqual({
      exitCode: 0,
    });
    expect(JSON.parse(stdout.getValue())).toMatchObject({
      moduleCode: 'core.dict',
      templateVersion: 's9-openforge-mvp-v1',
      safety: {
        noWrite: true,
      },
    });
    expect(stderr.getValue()).toBe('');
  });

  it('prints the generate plan as markdown', () => {
    const stdout = createWritableBuffer();
    const stderr = createWritableBuffer();

    expect(
      runCli(
        [
          'plan',
          '--schema',
          'tools/generator/examples/core.dict.schema.json',
          '--format',
          'markdown',
        ],
        stdout.stream,
        stderr.stream,
      ),
    ).toEqual({
      exitCode: 0,
    });
    expect(stdout.getValue()).toContain('# OpenForge Generate Plan: core.dict');
    expect(stdout.getValue()).toContain('S9');
    expect(stderr.getValue()).toBe('');
  });

  it('prints the readonly diff plan as JSON', () => {
    const stdout = createWritableBuffer();
    const stderr = createWritableBuffer();

    expect(
      runCli(
        [
          'diff',
          '--schema',
          'tools/generator/examples/core.dict.schema.json',
          '--format',
          'json',
        ],
        stdout.stream,
        stderr.stream,
      ),
    ).toEqual({
      exitCode: 0,
    });
    expect(JSON.parse(stdout.getValue())).toMatchObject({
      moduleCode: 'core.dict',
      templateVersion: 's9-openforge-mvp-v1',
      safety: {
        noWrite: true,
      },
    });
    expect(stdout.getValue()).toContain('protected-conflict');
    expect(stderr.getValue()).toBe('');
  });

  it('prints a preflight report for check', () => {
    const stdout = createWritableBuffer();
    const stderr = createWritableBuffer();

    expect(runCli(['check'], stdout.stream, stderr.stream)).toEqual({
      exitCode: 0,
    });
    expect(JSON.parse(stdout.getValue())).toMatchObject({
      moduleCode: 'core.dict',
      valid: true,
      noWrite: true,
      registry: {
        valid: true,
      },
    });
    expect(stderr.getValue()).toBe('');
  });

  it('prints an apply dry-run result without writing files', () => {
    const stdout = createWritableBuffer();
    const stderr = createWritableBuffer();

    expect(
      runCli(
        [
          'apply',
          '--schema',
          'tools/generator/examples/core.dict.v1.schema.json',
          '--dry-run',
        ],
        stdout.stream,
        stderr.stream,
      ),
    ).toEqual({
      exitCode: 0,
    });
    expect(JSON.parse(stdout.getValue())).toMatchObject({
      mode: 'dry-run',
      applied: false,
      manifest: {
        command:
          'pnpm openforge:apply -- --schema tools/generator/examples/core.dict.v1.schema.json --dry-run',
      },
      errors: [],
    });
    expect(stderr.getValue()).toBe('');
  });

  it('prints a rollback dry-run error for a missing manifest without writing', () => {
    const stdout = createWritableBuffer();
    const stderr = createWritableBuffer();

    expect(
      runCli(
        [
          'rollback',
          '--manifest',
          '.openforge/manifests/missing.json',
          '--dry-run',
        ],
        stdout.stream,
        stderr.stream,
      ),
    ).toEqual({
      exitCode: 1,
    });
    expect(JSON.parse(stdout.getValue())).toMatchObject({
      mode: 'dry-run',
      rolledBack: false,
      errors: [
        {
          path: 'manifestPath',
          message: 'Manifest file does not exist.',
        },
      ],
    });
    expect(stderr.getValue()).toBe('');
  });

  it('lists manifests without writing files', () => {
    const stdout = createWritableBuffer();
    const stderr = createWritableBuffer();

    expect(
      runCli(['manifest', '--list'], stdout.stream, stderr.stream),
    ).toEqual({
      exitCode: 0,
    });
    expect(JSON.parse(stdout.getValue())).toMatchObject({
      manifests: [],
      errors: [],
    });
    expect(stderr.getValue()).toBe('');
  });

  it('prints doctor readiness checks without writing files', () => {
    const stdout = createWritableBuffer();
    const stderr = createWritableBuffer();

    expect(runCli(['doctor'], stdout.stream, stderr.stream)).toEqual({
      exitCode: 0,
    });
    expect(JSON.parse(stdout.getValue())).toMatchObject({
      valid: true,
      checks: expect.arrayContaining([
        expect.objectContaining({
          id: 'workspace-root',
          status: 'pass',
        }),
        expect.objectContaining({
          id: 'template-packs',
          status: 'pass',
        }),
        expect.objectContaining({
          id: 'manifest-directory-status',
          status: 'pass',
        }),
      ]),
      errors: [],
    });
    expect(stderr.getValue()).toBe('');
  });

  it('prints CLI and generator-core status without writing files', () => {
    const stdout = createWritableBuffer();
    const stderr = createWritableBuffer();

    expect(runCli(['status'], stdout.stream, stderr.stream)).toEqual({
      exitCode: 0,
    });
    expect(JSON.parse(stdout.getValue())).toMatchObject({
      command: 'status',
      status: 'workspace-ready',
      workspace: {
        packageName: '@opencore/openforge',
        projectName: 'openforge',
      },
      generatorCore: {
        packageName: '@opencore/generator-core',
        projectName: 'generator-core',
      },
    });
    expect(stderr.getValue()).toBe('');
  });

  it('fails unknown commands with a clear help hint', () => {
    const stdout = createWritableBuffer();
    const stderr = createWritableBuffer();

    expect(runCli(['unknown'], stdout.stream, stderr.stream)).toEqual({
      exitCode: 1,
    });
    expect(stdout.getValue()).toBe('');
    expect(stderr.getValue()).toContain('Unknown OpenForge command: unknown');
    expect(stderr.getValue()).toContain(
      'Run --help to list available OpenForge commands.',
    );
  });
});
