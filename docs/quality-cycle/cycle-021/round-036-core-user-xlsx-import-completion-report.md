# Round 36: core.user XLSX Import Completion Report

Feature commit:
`1437eb8 feat(core-user): add xlsx user import / 新增用户 Excel 导入`

## Scope

Round 36 continued `core.user` productization by closing native XLSX import
format support. This is a minimal deployable stage, not the final user product
boundary.

## Implemented

- `GET /api/core/users/import-template` now returns
  `opencore-system-users-import-template.xlsx` with the standard XLSX MIME
  type.
- `POST /api/core/users/import` auto-detects XLSX zip payloads and existing
  CSV payloads from `contentBase64`.
- XLSX parsing supports inline strings, shared strings, boolean cells and
  basic value cells for the fixed user import columns.
- Existing import behavior remains: `core:user:import`, strict
  `updateExisting` boolean validation, partial failures, role/dept/post
  validation and update-session revocation.
- Admin Users now presents `Select CSV/XLSX file`.
- `core.user` smoke now includes `core.user.import.xlsx` with a dynamically
  generated XLSX workbook.

## Verification

- Standard round gates passed; repeated command transcripts were removed during docs compaction.

## Public Verification

- Public API: `http://144.217.243.161:39172`
- Public Admin: `http://144.217.243.161:39174`
- Public `pnpm smoke:core-user` passed and included `core.user.import.xlsx`.
- Public Admin Users chunk `/p__System__Users.241380ef.async.js` contains
  `Select CSV/XLSX file`.
- Public Admin same-origin `/api/core/users/import-template` returned
  `opencore-system-users-import-template.xlsx` and an XLSX `PK` zip payload.

## Remaining User Debt

- Dedicated User-page role assignment workflow if admitted.
- Email/phone/social account profile expansion remains out of this stage.
- Richer Excel styling/error-highlighting remains out of this stage.
