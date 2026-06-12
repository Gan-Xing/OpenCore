# Round 25 Completion Report: core.post Simple-list Option

Date: 2026-06-12
Feature commit: `27d15cc feat(core-post): add simple-list option loop`
Public API: `http://144.217.243.161:39172`
Public Admin: `http://144.217.243.161:39174`

## Scope

Round 25 closed the next `core.post` P1 productization gap: a dedicated
enabled-post option source consumed by Admin Users.

This round remains one deployable, verifiable and reversible stage. It does
not mark the entire post product as complete.

## Delivered

- Public post option consumer: `GET /api/core/posts/simple-list`.
- Lightweight option DTO: `{ code, name, order }`.
- Enabled-only, order/name sorted option queries for seed and Prisma
  repositories.
- SDK `listPostOptions()` method and typed `SystemPostOptionSummary`.
- Admin platform `listOpenCoreSystemPostOptions()` wrapper.
- Admin Users post name map and multi-select options now consume simple-list
  instead of the post management page.
- Permission-matrix guard that keeps simple consumer endpoints free of
  management permissions.
- Fixed-port/deploy/public `smoke-core-post.mjs` coverage.

## Verification

- `bash -n tools/scripts/run-local-api-smoke.sh tools/scripts/deploy-local-opencore.sh`
- `node --check tools/scripts/smoke-core-post.mjs`
- `node --check apps/admin/scripts/smoke-test.mjs`
- `pnpm nx test system --testFile=packages/system/src/system-post/system-post.spec.ts`
- `pnpm nx test sdk --testFile=packages/sdk/src/system-management-client.spec.ts`
- `pnpm nx test api --testFile=apps/api/src/modules/core/system-management/system-management.permission-matrix.spec.ts`
- `pnpm nx test admin`
- `pnpm openapi:export`
- `pnpm openapi:check`
- `pnpm sdk:check`
- `pnpm openapi:registry-tags:check`
- `pnpm registry:admin-routes:check`
- `pnpm prisma:validate`
- `pnpm smoke:api:local`
- `pnpm build:api`
- `pnpm build:admin`
- `pnpm deploy:opencore`

## Public Verification

- `GET http://144.217.243.161:39172/health/ready` returned 200.
- Public `tools/scripts/smoke-core-post.mjs` passed against
  `http://144.217.243.161:39172` with `OPENCORE_SMOKE_CHECK_DOCS=false`.
- `GET http://144.217.243.161:39174/system/users/` returned 200.
- Public Admin Users chunk `p__System__Users.7894d121.async.js` contains
  `Select posts`.
- Public main Admin bundle `umi.17f471f6.js` contains
  `/core/posts/simple-list`, API origin `http://144.217.243.161:39172` and no
  `/api/api/auth/login`.
- Public Admin proxy login returned 201 for both `/api/auth/login` and stale
  compatible `/api/api/auth/login` without printing tokens.

## Remaining post.product Debt

- Batch post deletion.
- Ordered list refinements / drag-sort persistence if admitted.
- Broader batch assignment workflows where they belong to user/role surfaces.
