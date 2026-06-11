# cycle-015 Implementation Notes

## Plan

1. Add an export-side recursive redaction helper in `CurrentPageExportButton`.
2. Use the same sensitive-key terminology as the detail drawer redaction guard.
3. Apply the helper before `JSON.stringify` for object-valued CSV cells.
4. Extend Admin smoke checks to require the helper, sensitive terms and serializer call path.
5. Update export/OpenForge docs to clarify that sensitive-column exclusion and object-cell fallback redaction are both required.
6. Run focused checks before the full quality-cycle gate.

## Notes

- This is a defensive fallback. Export column definitions must still exclude sensitive/detail-only columns wherever possible.
- Formula-prefix neutralization remains a separate step after normalization and before quote escaping.
- The helper intentionally avoids a generic `key` match because exported Admin records contain safe identifiers such as config keys, storage keys and request ids.

## Implemented

- `apps/admin/src/pages/shared/CurrentPageExportButton.tsx` now exports `redactCurrentPageExportValue` and applies it before object-valued CSV fallback JSON stringification.
- The helper redacts nested values whose keys match password, secret, token, credential, authorization, API key or client secret terminology.
- `apps/admin/scripts/smoke-test.mjs` now checks that current-page CSV export keeps object-cell redaction, sensitive-key coverage, formula-prefix neutralization and the serializer call path.
- `docs/development/export-upload-contract.md`, `docs/development/openforge-template-authoring.md` and `docs/development/openforge-v1-architecture.md` now require object-cell redaction before export JSON stringification.

## Focused Verification

- `pnpm exec prettier --write apps/admin/src/pages/shared/CurrentPageExportButton.tsx apps/admin/scripts/smoke-test.mjs docs/development/export-upload-contract.md docs/development/openforge-template-authoring.md docs/development/openforge-v1-architecture.md docs/quality-cycle/cycle-015/audit.md docs/quality-cycle/cycle-015/reference-comparison.md docs/quality-cycle/cycle-015/backlog.md docs/quality-cycle/cycle-015/implementation-notes.md`
- `NX_DAEMON=false pnpm nx test admin`
- `NX_DAEMON=false pnpm nx run-many -t typecheck -p admin,sdk`
- `NX_DAEMON=false pnpm nx run admin:lint`
- `NX_DAEMON=false pnpm nx test sdk --runInBand`
- `pnpm registry:admin-routes:check`
- `pnpm openforge:doctor`
- `pnpm openforge:gate`

The first attempt ran Admin typecheck and Admin test in parallel; both invoke `max setup`, which raced on `apps/admin/src/.umi`. Sequential reruns of `NX_DAEMON=false pnpm nx test admin` and `NX_DAEMON=false pnpm nx run-many -t typecheck -p admin,sdk` passed.
