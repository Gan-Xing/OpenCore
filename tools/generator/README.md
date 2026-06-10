# OpenForge

OpenForge is the OpenCore code generator workspace tool. The current implementation is the S9 read-only planning tool; V1 Full Implementation has started with architecture documentation only.

Current S9 capability:

- read module registry, OpenAPI snapshot, and manual schema inputs;
- output deterministic generate plans;
- output readonly diff plans;
- report safety and preflight issues;
- never write generated target files.

Root commands:

```bash
pnpm openforge:plan
pnpm openforge:diff
pnpm openforge:check
```

S9 safety boundaries:

- plan and diff are deterministic and read-only;
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
- patch-only plans for human-authored entry files;
- doctor and gate commands for repeatable local verification.

Stage A does not add write-capable commands. Until later V1 stages land, the only supported root commands remain `plan`, `diff`, and `check`.
