import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { applyOpenForge } from '../apply/apply-writer';
import {
  listOpenForgeManifests,
  rollbackOpenForge,
  showOpenForgeManifest,
} from './rollback-engine';

function createTempRepo(): string {
  return mkdtempSync(join(tmpdir(), 'openforge-rollback-'));
}

function removeTempRepo(repoRoot: string): void {
  rmSync(repoRoot, { force: true, recursive: true });
}

function appendToFile(path: string, content: string): void {
  writeFileSync(path, `${readFileSync(path, 'utf8')}${content}`);
}

describe('OpenForge rollback engine', () => {
  const schemaPath = 'tools/generator/examples/core.dict.v1.schema.json';
  const controllerTarget =
    'apps/api/src/modules/generated/core/dict/dict.controller.ts';

  it('builds a rollback dry-run plan without deleting generated files', () => {
    const repoRoot = createTempRepo();

    try {
      const applyResult = applyOpenForge({
        schemaPath,
        repoRoot,
        mode: 'write',
        yes: true,
      });
      const controllerPath = join(repoRoot, controllerTarget);
      const rollbackResult = rollbackOpenForge({
        manifestPath: applyResult.manifestPath ?? 'missing',
        repoRoot,
        mode: 'dry-run',
      });

      expect(rollbackResult).toMatchObject({
        mode: 'dry-run',
        rolledBack: false,
        errors: [],
      });
      expect(rollbackResult.entries.map((entry) => entry.action)).toEqual(
        expect.arrayContaining(['delete']),
      );
      expect(existsSync(controllerPath)).toBe(true);
    } finally {
      removeTempRepo(repoRoot);
    }
  });

  it('deletes files created by an apply manifest and writes rollback audit', () => {
    const repoRoot = createTempRepo();

    try {
      const applyResult = applyOpenForge({
        schemaPath,
        repoRoot,
        mode: 'write',
        yes: true,
      });
      const controllerPath = join(repoRoot, controllerTarget);

      expect(existsSync(controllerPath)).toBe(true);

      const rollbackResult = rollbackOpenForge({
        manifestPath: applyResult.manifestPath ?? 'missing',
        repoRoot,
        mode: 'write',
        yes: true,
      });

      expect(rollbackResult).toMatchObject({
        mode: 'write',
        rolledBack: true,
        errors: [],
      });
      expect(existsSync(controllerPath)).toBe(false);
      expect(
        existsSync(join(repoRoot, rollbackResult.auditPath ?? 'missing')),
      ).toBe(true);
      expect(
        readFileSync(
          join(repoRoot, rollbackResult.auditPath ?? 'missing'),
          'utf8',
        ),
      ).toContain(applyResult.manifest?.id ?? 'missing');
    } finally {
      removeTempRepo(repoRoot);
    }
  });

  it('restores updated generated files from apply backups', () => {
    const repoRoot = createTempRepo();

    try {
      const firstApply = applyOpenForge({
        schemaPath,
        repoRoot,
        mode: 'write',
        yes: true,
      });
      const controllerPath = join(repoRoot, controllerTarget);

      expect(firstApply.applied).toBe(true);

      appendToFile(controllerPath, '\n// generated file edit\n');

      const secondApply = applyOpenForge({
        schemaPath,
        repoRoot,
        mode: 'write',
        yes: true,
      });
      const updatedEntry = secondApply.entries.find(
        (entry) => entry.targetPath === controllerTarget,
      );

      expect(updatedEntry).toMatchObject({
        action: 'updated',
        rollbackAction: 'restore',
      });
      expect(
        existsSync(join(repoRoot, updatedEntry?.backupPath ?? 'missing')),
      ).toBe(true);
      expect(readFileSync(controllerPath, 'utf8')).not.toContain(
        'generated file edit',
      );

      const rollbackResult = rollbackOpenForge({
        manifestPath: secondApply.manifestPath ?? 'missing',
        repoRoot,
        mode: 'write',
        yes: true,
      });

      expect(rollbackResult.rolledBack).toBe(true);
      expect(readFileSync(controllerPath, 'utf8')).toContain(
        'generated file edit',
      );
    } finally {
      removeTempRepo(repoRoot);
    }
  });

  it('blocks rollback when a generated file changed after apply', () => {
    const repoRoot = createTempRepo();

    try {
      const applyResult = applyOpenForge({
        schemaPath,
        repoRoot,
        mode: 'write',
        yes: true,
      });
      const controllerPath = join(repoRoot, controllerTarget);

      appendToFile(controllerPath, '\n// changed after apply\n');

      const rollbackResult = rollbackOpenForge({
        manifestPath: applyResult.manifestPath ?? 'missing',
        repoRoot,
        mode: 'write',
        yes: true,
      });

      expect(rollbackResult.rolledBack).toBe(false);
      expect(rollbackResult.errors.map((issue) => issue.message)).toEqual(
        expect.arrayContaining([
          'File changed after apply; refusing to delete.',
        ]),
      );
      expect(readFileSync(controllerPath, 'utf8')).toContain(
        'changed after apply',
      );
      expect(existsSync(join(repoRoot, '.openforge/rollbacks'))).toBe(false);
    } finally {
      removeTempRepo(repoRoot);
    }
  });

  it('rejects rollback write mode without explicit yes', () => {
    const repoRoot = createTempRepo();

    try {
      const applyResult = applyOpenForge({
        schemaPath,
        repoRoot,
        mode: 'write',
        yes: true,
      });
      const rollbackResult = rollbackOpenForge({
        manifestPath: applyResult.manifestPath ?? 'missing',
        repoRoot,
        mode: 'write',
        yes: false,
      });

      expect(rollbackResult.rolledBack).toBe(false);
      expect(rollbackResult.errors).toEqual(
        expect.arrayContaining([
          {
            severity: 'error',
            path: 'yes',
            message:
              'OpenForge rollback write mode requires explicit --yes confirmation.',
          },
        ]),
      );
    } finally {
      removeTempRepo(repoRoot);
    }
  });

  it('lists and shows apply manifests without writing files', () => {
    const repoRoot = createTempRepo();

    try {
      mkdirSync(dirname(join(repoRoot, '.openforge/manifests/.keep')), {
        recursive: true,
      });
      const applyResult = applyOpenForge({
        schemaPath,
        repoRoot,
        mode: 'write',
        yes: true,
      });
      const listResult = listOpenForgeManifests({ repoRoot });
      const showResult = showOpenForgeManifest({
        manifestIdOrPath: applyResult.manifest?.id ?? 'missing',
        repoRoot,
      });

      expect(listResult.manifests).toEqual([
        expect.objectContaining({
          id: applyResult.manifest?.id,
          path: applyResult.manifestPath,
          moduleCode: 'core.dict',
        }),
      ]);
      expect(showResult).toMatchObject({
        manifestPath: applyResult.manifestPath,
        manifest: {
          id: applyResult.manifest?.id,
          moduleCode: 'core.dict',
        },
        errors: [],
      });
    } finally {
      removeTempRepo(repoRoot);
    }
  });
});
