# Round 38: core.config XLSX Export Completion Report

Feature commit:
`3419c24 feat(core-config): add xlsx config export / 新增配置 Excel 导出`

## Scope

Round 38 continued `core.config` productization by adding a native XLSX export
payload. This is a minimal deployable stage, not the final configuration
management product boundary.

## Implemented

- `GET /api/core/config/export` now returns
  `opencore-system-config.xlsx` metadata plus `contentType/contentBase64`.
- The XLSX payload uses the standard Excel MIME type and a valid zip workbook.
- Export columns include
  `category/name/key/value/valueType/visibility/public/description/remark`.
- Secret config values stay redacted in exported rows.
- `packages/system/src/export-xlsx.ts` centralizes simple workbook generation
  and is reused by user and config exports.
- SDK/OpenAPI export preview types now allow optional file payload fields.
- Admin Config now has a `Download Excel` action guarded by
  `core:config:export`.
- Admin Users and Config share `downloadBase64File()`.
- `core.config` smoke now guards filename, MIME, base64 body, XLSX zip header,
  value column and the existing config cache/value behavior.

## Verification

- Standard round gates passed; repeated command transcripts were removed during docs compaction.

## Public Verification

- Public API: `http://144.217.243.161:39172`
- Public Admin: `http://144.217.243.161:39174`
- Public `pnpm smoke:core-config` passed and included
  `core.config.export.xlsx`.
- Public Admin Config chunk `/p__System__Config.911ece50.async.js` contains
  Excel download UI markers.
- Public Admin same-origin `/api/core/config/export?page=1&pageSize=100`
  returned `opencore-system-config.xlsx` with XLSX MIME, value column and `PK`
  zip payload.

## Remaining Config Debt

- Batch config deletion remains out of this stage.
- Secret vault/KMS integration remains out of this stage.
- Broader runtime feature-flag propagation remains out of this stage.
