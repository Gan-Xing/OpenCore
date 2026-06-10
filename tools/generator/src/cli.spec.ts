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
    expect(stdout.getValue()).toContain('read-only planning tool');
    expect(stdout.getValue()).toContain('Apply writes require explicit --yes');
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
});
