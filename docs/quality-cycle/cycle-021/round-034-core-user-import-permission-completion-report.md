# Round 34: core.user Import Permission Completion Report

Date: 2026-06-13
Feature commit:
`f152c4d feat(core-user): add import permission / 新增用户导入权限`

## Capability

`core.user` import permission productization.

## Reference Comparison

Yudao guards user import with `system:user:import`, separate from user create.
OpenCore previously reused `core:user:create` for import-template and import,
which meant single-user creation also granted bulk import. This round admits a
dedicated `core:user:import` permission while leaving native XLSX/binary Excel
depth for a later slice.

## Implemented

- Added `import` to the permission action contract.
- Registered `core:user:import` only on the `core.user` module.
- Let registry seed add the new permission and include it in the seeded admin
  role.
- Moved user import-template and import routes to `core:user:import`.
- Extended contracts, module-registry, SDK fixture and API permission-matrix
  tests.
- Added `canImportUsers` to Admin access.
- Disabled Admin Users import controls without `core:user:import`.
- Extended Admin static smoke.
- Extended core-user smoke with a temporary create-only role/user that receives
  403 from both import endpoints.

## Verification

- `pnpm nx test contracts`
- `pnpm nx test module-registry`
- `pnpm nx test sdk --testFile=registry-fixtures.spec.ts`
- `pnpm nx test api --testFile=rbac.permission-matrix.spec.ts`
- `node scripts/smoke-test.mjs` from `apps/admin`
- `pnpm nx run-many -t typecheck --projects=api,admin,sdk,system,module-registry,contracts`
- `pnpm openapi:export`
- `pnpm sdk:check`
- `pnpm openapi:check`
- `pnpm openapi:registry-tags:check`
- `pnpm nx test admin`
- `pnpm smoke:api:local`
- `pnpm prisma:validate`
- `pnpm build:api`
- `pnpm build:admin`
- `pnpm format:check`
- `git diff --check`
- `pnpm deploy:opencore`

## Public Verification

- Public API: `http://144.217.243.161:39172`
- Public Admin: `http://144.217.243.161:39174`
- Public `pnpm smoke:core-user` passed against the API origin.
- Public user smoke proved create-only users cannot access import endpoints.
- Public Admin Users page returned 200.
- Public main bundle contains `core:user:import` and user import API paths.
- Public Users chunk contains import UI and missing-permission markers.
- Public Admin proxy login passed for `/api/auth/login` and `/api/api/auth/login`.
- Public API origin `/api/api/auth/login` passed.
- Public Admin same-origin permission catalog returned `core:user:import`.
- Public Admin same-origin import-template returned the expected filename.

## Remaining User Debt

- Native XLSX/binary Excel import/export depth and full server-side Excel
  export formatting.
- Dedicated User-page role assignment workflow only if admitted separately.
- Email/phone profile fields and social binding remain out of this round.
