# Round 044 core.config Runtime Admin Config Completion Report

Date: 2026-06-13
Feature commit:
`bd55c61 feat(core-config): add runtime admin config / 新增运行时管理端配置`

## Scope

This round closed the first runtime-propagation gap in `core.config`.
OpenCore already had a public `opencore.admin.title` config row, but Admin
bootstrap and the login page still used hard-coded title text.

The accepted loop covers a public runtime API, SDK, Admin bootstrap/login,
OpenAPI, tests, fixed-port smoke, deploy smoke and public URL verification.

## Implemented

- Added `GET /api/core/config/runtime`.
- Returned `{ adminTitle }` from the existing public config value cache.
- Kept runtime config public and recorded that in the API permission matrix.
- Added SDK `getConfigRuntime()` without a token argument.
- Added Admin `getOpenCoreAdminRuntimeConfig()`.
- Wired Admin `getInitialState` settings title to runtime config.
- Updated the login page to render the runtime title.
- Extended Admin static smoke for runtime-config service and login title
  markers.
- Extended `core.config` smoke to update `opencore.admin.title`, verify
  runtime reads the new title, and restore the original value.

## Verification

- `node --check tools/scripts/smoke-core-config.mjs`
- `node --check apps/admin/scripts/smoke-test.mjs`
- `pnpm nx test system --testFile=system-config.spec.ts`
- `pnpm nx test sdk --testFile=system-management-client.spec.ts`
- `pnpm nx test api --testFile=system-management.permission-matrix.spec.ts`
- `pnpm nx test admin`
- `pnpm openapi:export`
- `pnpm openapi:check`
- `pnpm sdk:check`
- `pnpm openapi:registry-tags:check`
- `pnpm prisma:validate`
- `pnpm nx run-many -t typecheck --projects=api,admin,sdk,system,module-registry,contracts`
- `pnpm build:api`
- `pnpm build:admin`
- `pnpm format:check`
- `git diff --check`
- `pnpm smoke:api:local`
- `pnpm deploy:opencore`

Fixed-port local smoke passed on `39173` and included:

- `core.config.runtime`
- `core.config.runtime-cache-invalidation`

Deployment completed through `pnpm deploy:opencore` with API on `39172` and
Admin on `39174`.

## Public Verification

- Public API: `http://144.217.243.161:39172`
- Public Admin: `http://144.217.243.161:39174`
- Public `pnpm smoke:core-config` passed with runtime config checks.
- Public Admin main bundle `umi.19450df1.js` contains
  `/core/config/runtime`, the deployed API origin and no duplicate
  `/api/api/auth/login`.
- Public Admin same-origin `/api/core/config/runtime` is readable without a
  bearer token.
- Public Admin same-origin `/api/auth/login` and compatible
  `/api/api/auth/login` both succeeded.
- Public Admin same-origin proxy updated `opencore.admin.title`; Admin runtime
  and public API runtime both returned the new title; the original title was
  restored.

## Remaining Debt

This round does not claim full configuration productization. Remaining admitted
`core.config` debt:

- broader runtime propagation boundaries;
- any admitted secret vault/KMS integration.

Still out of scope for this round:

- multi-key feature flag propagation;
- per-environment config promotion;
- cluster-wide push invalidation;
- secret vault/KMS storage or rotation.
