# OpenForge

OpenForge is the OpenCore code generator workspace tool. The current implementation includes S9 read-only planning plus V1 schema/config validation, deterministic template rendering, a virtual file system, safe apply, manifests, manifest-based rollback, and the Stage G-I API/Admin/SDK/Test/Docs generator packs.

Current S9 capability:

- read module registry, OpenAPI snapshot, and manual schema inputs;
- output deterministic generate plans;
- output readonly diff plans;
- report safety and preflight issues;
- render deterministic V1 virtual files;
- render NestJS API module/controller/service/repository/DTO/spec skeletons;
- render Umi Max / Ant Design Pro page/form/detail/export/smoke skeletons;
- render SDK types/client/spec/generated-index skeletons;
- render module/API/Admin/runbook/patch-review docs;
- apply generated-owned files only with explicit `--yes`;
- roll back apply manifests only with explicit `--yes`.

Root commands:

```bash
pnpm openforge:plan
pnpm openforge:diff
pnpm openforge:check
pnpm openforge:apply -- --dry-run
pnpm openforge:rollback -- --manifest .openforge/manifests/<id>.json --dry-run
pnpm openforge:manifest -- --list
```

V1 examples:

```bash
pnpm openforge:plan -- --schema tools/generator/examples/core.dict.v1.schema.json --format json
pnpm openforge:check -- --schema tools/generator/examples/core.dict.v1.schema.json
pnpm openforge:apply -- --schema tools/generator/examples/core.dict.v1.schema.json --dry-run
pnpm openforge:apply -- --schema tools/generator/examples/core.dict.v1.schema.json --yes
pnpm openforge:rollback -- --manifest .openforge/manifests/<id>.json --dry-run
pnpm openforge:rollback -- --manifest .openforge/manifests/<id>.json --yes
pnpm openforge:manifest -- --show <id>
```

Config DSL fixture:

```text
tools/generator/examples/openforge.v1.config.json
```

Safety boundaries:

- plan and diff are deterministic and read-only;
- apply defaults to dry-run and writes nothing unless `--yes` is present;
- apply write mode records `.openforge/manifests/*.json`, writes backups for updated generated files, verifies post-write hashes, and rolls back partial generated-file writes on failure;
- rollback defaults to dry-run and writes nothing unless `--yes` is present;
- rollback deletes or restores only files recorded in the manifest, blocks files modified after apply, and writes `.openforge/rollbacks/*.json` audit records on success;
- protected paths are blocked, including `.env*`, `prisma/schema.prisma`, and `prisma/migrations/**`;
- existing files without an OpenForge generated marker are reported as `protected-conflict`;
- P4/P5 module schemas are rejected;
- Prisma schema writes and migrations are rejected.

V1 target architecture:

- contract layer for template, apply, manifest, rollback, marker, patch plan, and generator config protocols;
- schema/config DSL for API/Admin/SDK/Test/Docs skeleton generation;
- default template pack `openforge-default-nest-umi-v1`;
- virtual file system before any disk mutation;
- safe apply writer with explicit `--yes`, generated marker checks, manifest output, and rollback support;
- API generator pack with Swagger decorators, `RequirePermission`, repository placeholder, no Prisma access, and patch-only app module registration;
- Admin generator pack with ProTable, Modal/Drawer forms, ProDescriptions, export button, smoke skeleton, permission-aware operations, generated client placeholder, and patch-only route/access plans;
- SDK generator pack with schema-derived types, request wrapper client, client spec, generated barrel file, and patch-only SDK index plan;
- Docs generator pack with module, API, Admin, runbook, and patch-review fragments carrying schema hash and template version review metadata;
- patch-only plans for human-authored entry files;
- doctor and gate commands for repeatable local verification.

Stage C adds Schema/config DSL V1 validation only. It does not add template rendering, apply, rollback, manifest writing, or generated target file writes.

Stage D adds the default template pack and virtual file system renderer. Rendering remains in memory and deterministic; OpenForge still does not write generated target files.

Stage E adds `apply`. Dry-run is still the default. Real writes require `--yes`, only touch generated-owned files with OpenForge markers or missing generated targets, and write a manifest under `.openforge/manifests/`.

Stage F adds `rollback` and `manifest`. Rollback dry-run shows the manifest rollback plan. Write mode requires `--yes`, deletes files created by apply only when they still match the manifest hash and marker, restores updated files from `.openforge/backups/`, and writes rollback audit records under `.openforge/rollbacks/`. Doctor, e2e gate, and final V1 hardening remain pending.

Stage G hardens the API generator pack. API virtual files now include NestJS module/controller/service/repository/DTO/spec skeletons, Swagger decorators, permission decorators, generated repository placeholders, semantic temp-project typecheck tests, and an app-module patch plan.

Stage H hardens the Admin generator pack. Admin virtual files now include a ProTable page, ModalForm, DrawerForm, ProDescriptions detail drawer, export button, smoke test, generated client placeholder, permission-aware operations, route/access patch plans, structural golden snapshots, and TSX transpile coverage.

Stage I hardens the SDK/Test/Docs generator pack. SDK virtual files now include schema-derived types, generated request wrapper client, generated client spec, and generated barrel file; docs include module, API, Admin, runbook, and patch-review fragments; patch-only SDK index integration is emitted for human review. API/Admin generated tests now assert stronger route, permission, DTO, and placeholder behavior. Doctor, e2e gate, and final V1 hardening remain pending.
