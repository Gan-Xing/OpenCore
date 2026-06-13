# Round 35: core.user XLSX Export Completion Report

Date: 2026-06-13
Feature commit:
`407dbd0 feat(core-user): add xlsx user export / 新增用户 Excel 导出`

## Capability

`core.user` native XLSX export productization.

## Reference Comparison

RuoYi guards user export with `system:user:export` and writes an Excel response
through `ExcelUtil.exportExcel`. Yudao exposes `/export-excel` with
`system:user:export` and writes `用户数据.xls` through `ExcelUtils.write`.
OpenCore keeps the API JSON boundary for this stage and returns a real XLSX
payload as `contentBase64`, leaving XLSX import parsing to a later loop.

## Implemented

- Added optional export file fields to the shared RBAC export DTO and SDK type.
- Changed `core.user` export to return `opencore-system-users.xlsx`.
- Generated a valid XLSX zip container with `fflate`.
- Kept `GET /api/core/users/export` protected by `core:user:export`.
- Added Admin `canExportUsers`.
- Added Admin Users `Download Excel` using the backend export payload.
- Extended Admin static smoke for export service, permission and UI markers.
- Extended `core.user` smoke with `core.user.export.xlsx`.
- Added `tools/scripts/sync-prisma-client-instances.mjs` and chained it from
  `pnpm prisma:generate` to prevent stale pnpm peer-instance Prisma clients
  after install.

## Verification

- `pnpm nx test contracts`
- `pnpm nx test module-registry`
- `pnpm nx test sdk --testFile=rbac-client.spec.ts`
- `pnpm nx test api --testFile=rbac.permission-matrix.spec.ts`
- `pnpm nx test system --testFile=system-user.spec.ts`
- `pnpm nx test admin`
- `pnpm install --frozen-lockfile --ignore-scripts`
- `pnpm prisma:generate`
- `pnpm nx run-many -t typecheck --projects=api,admin,sdk,system`
- `pnpm openapi:export`
- `pnpm sdk:check`
- `pnpm openapi:check`
- `pnpm openapi:registry-tags:check`
- `pnpm format:check`
- `pnpm smoke:api:local`
- `pnpm prisma:validate`
- `pnpm build:api`
- `pnpm build:admin`
- `git diff --check`
- `pnpm deploy:opencore`

## Public Verification

- Public API: `http://144.217.243.161:39172`
- Public Admin: `http://144.217.243.161:39174`
- Public `pnpm smoke:core-user` passed against the API origin and included
  `core.user.export.xlsx`.
- Public Admin Users page returned 200.
- Public main bundle `umi.c69be9c1.js` contains `core:user:export` and
  `/core/users/export`.
- Public Users chunk `p__System__Users.375bc26e.async.js` contains
  `Download Excel`, `User Excel export downloaded` and
  `Missing core:user:export`.
- Public Admin proxy login passed for `/api/auth/login` and `/api/api/auth/login`.
- Public API origin `/api/api/auth/login` passed.
- Public Admin same-origin user export returned filename
  `opencore-system-users.xlsx`, the Excel MIME type and an XLSX `PK` zip
  header.

## Remaining User Debt

- Native XLSX import parsing and validation.
- Dedicated User-page role assignment workflow only if admitted separately.
- Email/phone profile fields and social binding remain out of this round.
