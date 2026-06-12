# Round 23 Completion Report: core.user Department Tree Filter

Date: 2026-06-12  
Feature commit: `fda33c4 feat(core-user): add department tree filter loop`  
Public API: `http://144.217.243.161:39172`  
Public Admin: `http://144.217.243.161:39174`

## Scope

Round 23 closed the next `core.user` P1 productization gap: department
side-tree filtering for user management.

This round keeps the cycle-021 rule intact: one deployable, verifiable and
reversible stage, not a claim that the whole user product is finished.

## Delivered

- `GET /api/core/users` and `GET /api/core/users/export` now accept optional
  `deptId`.
- Seed and Prisma repositories filter by the selected department plus
  descendants and reject unknown department IDs.
- SDK request types and client methods support user list/export query
  parameters.
- OpenAPI includes the `deptId` query parameter for user list/export.
- Admin Users has a left Department scope tree, an All departments reset and
  live `core.dept` option loading.
- Static Admin smoke locks the department-filter UI markers.
- Fixed-port/deploy/public `core.user` smoke covers unknown-dept rejection,
  direct department filtering, parent subtree filtering and unrelated
  department exclusion.

## Verification

- `node --check tools/scripts/smoke-core-user.mjs`
- `node --check apps/admin/scripts/smoke-test.mjs`
- `pnpm nx test system --testFile=packages/system/src/system-user/system-user.spec.ts`
- `pnpm nx test sdk --testFile=packages/sdk/src/rbac-client.spec.ts`
- `pnpm nx test admin`
- `pnpm nx test api --testFile=apps/api/src/modules/core/rbac/permission.guard.spec.ts`
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
- Public `tools/scripts/smoke-core-user.mjs` passed against
  `http://144.217.243.161:39172` with `OPENCORE_SMOKE_CHECK_DOCS=false`.
- `GET http://144.217.243.161:39174/system/users/` returned 200 with
  `cache-control: no-cache`.
- Public Admin Users chunk `p__System__Users.f2a8caa6.async.js` contains
  `Department scope`, `All departments` and `deptId`.

## Remaining user.product Debt

- Profile/avatar/social endpoints.
- Excel import/export file workflows.
- Standalone user option/simple-list endpoints.
- Batch user delete.
- Separate User-page role assignment dialog.
