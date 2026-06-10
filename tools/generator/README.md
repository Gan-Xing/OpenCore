# OpenForge

OpenForge is the OpenCore code generator workspace tool. The current implementation includes S9 read-only planning plus V1 schema/config validation, deterministic template rendering, a virtual file system, and the Stage E safe apply writer.

Current S9 capability:

- read module registry, OpenAPI snapshot, and manual schema inputs;
- output deterministic generate plans;
- output readonly diff plans;
- report safety and preflight issues;
- render deterministic V1 virtual files;
- apply generated-owned files only with explicit `--yes`.

Root commands:

```bash
pnpm openforge:plan
pnpm openforge:diff
pnpm openforge:check
pnpm openforge:apply -- --dry-run
```

V1 examples:

```bash
pnpm openforge:plan -- --schema tools/generator/examples/core.dict.v1.schema.json --format json
pnpm openforge:check -- --schema tools/generator/examples/core.dict.v1.schema.json
pnpm openforge:apply -- --schema tools/generator/examples/core.dict.v1.schema.json --dry-run
pnpm openforge:apply -- --schema tools/generator/examples/core.dict.v1.schema.json --yes
```

Config DSL fixture:

```text
tools/generator/examples/openforge.v1.config.json
```

Safety boundaries:

- plan and diff are deterministic and read-only;
- apply defaults to dry-run and writes nothing unless `--yes` is present;
- write mode records `.openforge/manifests/*.json`, verifies post-write hashes, and rolls back partial generated-file writes on failure;
- protected paths are blocked, including `.env*`, `prisma/schema.prisma`, and `prisma/migrations/**`;
- existing files without an OpenForge generated marker are reported as `protected-conflict`;
- P4/P5 module schemas are rejected;
- Prisma schema writes and migrations are rejected.

V1 target architecture:

- contract layer for template, apply, manifest, rollback, marker, patch plan, and generator config protocols;
- schema/config DSL for API/Admin/SDK/Test/Docs skeleton generation;
- default template pack `openforge-default-nest-umi-v1`;
- virtual file system before any disk mutation;
- safe apply writer with explicit `--yes`, generated marker checks, manifest output, and later rollback support;
- patch-only plans for human-authored entry files;
- doctor and gate commands for repeatable local verification.

Stage C adds Schema/config DSL V1 validation only. It does not add template rendering, apply, rollback, manifest writing, or generated target file writes.

Stage D adds the default template pack and virtual file system renderer. Rendering remains in memory and deterministic; OpenForge still does not write generated target files.

Stage E adds `apply`. Dry-run is still the default. Real writes require `--yes`, only touch generated-owned files with OpenForge markers or missing generated targets, and write a manifest under `.openforge/manifests/`. Rollback, manifest listing, doctor, e2e gate, and final V1 hardening remain pending.
