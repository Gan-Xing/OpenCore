# OpenForge Schema Authoring

更新时间：2026-06-10

OpenForge schema files describe a module skeleton that OpenForge can plan, diff, render, apply and roll back safely. Start from `tools/generator/examples/core.dict.v1.schema.json` and keep schemas explicit; OpenForge must not infer business behavior from names alone.

## Required Inputs

Schema authors must align these sources:

- Module registry: module code, layer, permissions, menus and OpenAPI tags.
- OpenAPI snapshot: paths, tags and DTO surface already known to OpenCore.
- Manual schema: resource, fields, actions, list/form/detail/export/docs/test settings.
- Generator config: output root, protected paths, patch-only paths and write policy.

## Field Rules

Use supported field types only:

```text
string
text
number
boolean
datetime
enum
json
relation
file
```

Field names must be stable and declared before they are used in list, form, detail, filter, export or docs selections.

## Permissions And Actions

Permission codes must use:

```text
<module-layer>:<resource>:<action>
```

Schema actions should map to registered permissions such as read, create, update, delete and export. If the module registry does not contain the permission, fix the registry or schema before rendering.

## Writable And Patch-Only Outputs

OpenForge may create or update generated-owned files with valid markers:

- `apps/api/src/modules/generated/**`
- `apps/admin/src/pages/Generated/**`
- `packages/sdk/src/generated/**`
- `docs/generated/openforge/**`
- `prisma/openforge-drafts/**`
- `openforge-patches/**`

OpenForge must not directly modify:

- `.env*`
- `prisma/schema.prisma`
- `prisma/migrations/**`
- `apps/api/src/app/app.module.ts`
- `apps/admin/.umirc.ts`
- `apps/admin/src/access.ts`
- `packages/module-registry/src/modules.ts`
- `packages/sdk/src/index.ts`

Those human-authored entry files are handled through patch-only markdown plans.

## Prisma Boundary

Schemas may request Prisma model draft and migration hint output only. OpenForge does not write `prisma/schema.prisma` and does not create migration directories. A developer must review and apply Prisma changes manually in a later authorized task.

## S10 Collaboration Usage

For S10 collaboration, create schemas only for approved collaboration modules such as message, todo or Approval Lite. Keep the same V1 rules:

- Register the module and permissions first.
- Keep generated API repositories as placeholders until persistence is approved.
- Review app module, admin route/access, SDK index and module registry patch plans manually.
- Do not use OpenForge to introduce full workflow, BPMN, RAG, Agent or P4/P5 industry modules.

## Validation

Run:

```bash
pnpm openforge:check -- --schema <schema>
pnpm openforge:diff -- --schema <schema> --format json
pnpm openforge:apply -- --schema <schema> --dry-run
pnpm openforge:gate
```

Use `--yes` only in an explicit generated-output task or temp repo e2e.
