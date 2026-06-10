# OpenForge

OpenForge is the OpenCore S9 read-only planning tool.

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
