# OpenForge Apply And Rollback Runbook

更新时间：2026-06-10

OpenForge defaults to dry-run. Real writes require `--yes` and are limited to generated-owned files or generated patch-plan files. Never use OpenForge to overwrite human-authored files, write Prisma schema/migrations, or introduce P4/P5 modules.

## Plan, Diff And Check

```bash
pnpm openforge:plan -- --schema tools/generator/examples/core.dict.v1.schema.json --format json
pnpm openforge:diff -- --schema tools/generator/examples/core.dict.v1.schema.json --format json
pnpm openforge:check -- --schema tools/generator/examples/core.dict.v1.schema.json
pnpm openforge:doctor
pnpm openforge:status
pnpm openforge:gate
```

These commands are read-only. They must not create `.openforge` or generated output directories.

## Dry-Run Apply

```bash
pnpm openforge:apply -- --schema tools/generator/examples/core.dict.v1.schema.json --dry-run
```

Review:

- target paths and artifact kinds;
- marker metadata, especially `schemaHash`, `templateVersion`, `moduleCode` and `artifactKind`;
- patch-only plans under `openforge-patches/**`;
- Prisma drafts under `prisma/openforge-drafts/**`.

## Write Apply

Only run write mode when the task explicitly authorizes generated files:

```bash
pnpm openforge:apply -- --schema <schema> --yes
```

Write mode may create or update generated-owned files. Existing files without a valid OpenForge marker block the whole apply. If every generated file is already unchanged, apply is a no-op and does not overwrite the previous manifest.

## Manifest Review

List and inspect manifests:

```bash
pnpm openforge:manifest -- --list
pnpm openforge:manifest -- --show <id>
```

Review:

- `schemaPath`
- `moduleCode`
- `templateVersion`
- input hashes
- each entry `targetPath`, `artifactKind`, `action`, `beforeHash`, `afterHash`, `rollbackAction`
- backup paths for updated generated files

Manifests must not contain `.env`, passwords, tokens, credentials or runtime URLs.

## Rollback Dry Run

```bash
pnpm openforge:rollback -- --manifest .openforge/manifests/<id>.json --dry-run
```

Rollback dry-run shows whether files would be deleted, restored, skipped or blocked.

## Rollback Write

Only run write rollback when the manifest and current files match:

```bash
pnpm openforge:rollback -- --manifest .openforge/manifests/<id>.json --yes
```

Rollback deletes files created by the manifest only if the current hash still matches and the file still has a valid OpenForge marker. Rollback restores updated files from `.openforge/backups/**` only if the backup hash matches the manifest.

If rollback blocks, do not force-delete files. Inspect the changed file and decide whether it is user-authored work.

## Post-Command No-Write Check

After read-only and dry-run commands:

```bash
test ! -e .openforge
test ! -e apps/api/src/modules/generated
test ! -e apps/admin/src/pages/Generated
test ! -e docs/generated/openforge
test ! -e openforge-patches
test ! -e packages/sdk/src/generated
test ! -e prisma/openforge-drafts
```

After an intentional write apply, those paths may exist and must be reviewed through generated markers and manifests before commit.
