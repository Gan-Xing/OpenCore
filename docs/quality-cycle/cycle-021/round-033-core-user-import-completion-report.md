# Round 33: core.user Import Template and CSV Import Completion Report

Date: 2026-06-13
Feature commit:
`1c49e36 feat(core-user): add user import loop / 新增用户导入闭环`

## Capability

`core.user` import template and CSV import productization.

## Reference Comparison

RuoYi exposes user import template and import endpoints beside user export.
Yudao exposes the same surface with structured created, updated and failed
username results. OpenCore admitted a CSV-compatible import-template/import
loop with structured partial results while leaving native XLSX/binary Excel
depth as a later file-format slice.

## Implemented

- Added user import template, import request, import failure and import result
  DTOs.
- Added CSV template generation with fixed
  `username/displayName/password/roleCodes/deptId/postCodes/enabled` columns.
- Added strict base64, CSV header, max-size, empty-file and unclosed-quote
  guards.
- Added row-level import handling that records business failures without
  aborting valid rows.
- Required `updateExisting` to be a real boolean and reject string booleans.
- Created new users and updated existing normal users through existing
  repository validation.
- Preserved system-user mutation protection.
- Revoked active sessions for usernames updated by import.
- Added `GET /api/core/users/import-template` and
  `POST /api/core/users/import`, guarded by `core:user:create`.
- Extended OpenAPI, SDK, permission matrix and Admin platform services.
- Added Admin Users template download, import modal, update-existing toggle
  and import result/failure display.
- Extended Admin static smoke and fixed-port/public `core.user` smoke.

## Verification

- Standard round gates passed; repeated command transcripts were removed during docs compaction.

- `node scripts/smoke-test.mjs` from `apps/admin`

## Public Verification

- Public API: `http://144.217.243.161:39172`
- Public Admin: `http://144.217.243.161:39174`
- Public `pnpm smoke:core-user` passed against the API origin.
- Public Admin Users page returned 200.
- Public Users chunk contains import modal UI markers.
- Public main bundle contains `/core/users/import-template` and
  `/core/users/import`.
- Public Admin proxy login passed for `/api/auth/login` and `/api/api/auth/login`.
- Public API origin `/api/api/auth/login` passed.
- Public Admin same-origin import-template returned the expected filename and
  sample row.
- Public Admin same-origin import strict boolean guard returned 400 for
  `updateExisting: "true"`.

## Remaining User Debt

- Native XLSX/binary Excel import/export depth and full server-side Excel
  export formatting.
- Dedicated `core:user:import` permission only if admitted as a separate
  permission registry/menu/role migration loop.
- Dedicated User-page role assignment workflow only if admitted separately.
- Email/phone profile fields and social binding remain out of this round.
