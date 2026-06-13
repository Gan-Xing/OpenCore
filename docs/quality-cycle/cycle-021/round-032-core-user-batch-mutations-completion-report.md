# Round 32: core.user Batch Mutations Completion Report

Date: 2026-06-13
Feature commit:
`1bfd082 feat(core-user): add batch user mutations / 新增用户批量变更闭环`

## Capability

`core.user` batch status/delete productization.

## Reference Comparison

RuoYi exposes batch user deletion through `DELETE /system/user/{userIds}` and
status changes through `changeStatus`. Yudao exposes `delete-list` and
`update-status`. OpenCore admitted the same management batch workflow while
leaving Excel import/export as a later, higher-dependency slice.

## Implemented

- Added batch user status and delete DTOs plus a shared batch mutation result.
- Added repository-level batch ID validation for empty arrays, duplicates,
  missing users and system users.
- Added seed and Prisma repository batch status/delete implementations.
- Used a Prisma transaction for batch user delete cleanup.
- Added `PATCH /api/core/users/batch/status` with `core:user:update`.
- Added `DELETE /api/core/users/batch` with `core:user:delete`.
- Revoked active sessions for all affected usernames after batch status/delete.
- Extended OpenAPI, SDK, permission matrix and Admin platform services.
- Added Admin Users row selection and batch toolbar actions.
- Extended Admin static smoke and fixed-port/public `core.user` smoke.

## Verification

- `pnpm prisma:validate`
- `pnpm nx test system --testFile=system-user.spec.ts`
- `pnpm nx test sdk --testFile=rbac-client.spec.ts`
- `pnpm nx test api --testFile=rbac.permission-matrix.spec.ts`
- `node scripts/smoke-test.mjs` from `apps/admin`
- `pnpm nx run-many -t typecheck --projects=api,admin,sdk,system`
- `pnpm openapi:export`
- `pnpm openapi:check`
- `pnpm sdk:check`
- `pnpm nx test admin`
- `pnpm smoke:api:local`
- `pnpm build:api`
- `pnpm build:admin`
- `pnpm format:check`
- `pnpm openapi:registry-tags:check`
- `pnpm deploy:opencore`

## Public Verification

- Public API: `http://144.217.243.161:39172`
- Public Admin: `http://144.217.243.161:39174`
- Public `pnpm smoke:core-user` passed against the API origin.
- Public Admin Users page returned 200.
- Public Users chunk contains batch UI markers.
- Public main bundle contains the batch API paths.
- Public Admin proxy login passed for `/api/auth/login` and `/api/api/auth/login`.
- Public API origin `/api/api/auth/login` passed.
- Public Admin same-origin batch status guard returned 400 for empty `userIds`.

## Remaining User Debt

- Excel import/export/template workflows.
- Dedicated User-page role assignment workflow only if admitted separately.
- Email/phone profile fields and social binding remain out of this round.
