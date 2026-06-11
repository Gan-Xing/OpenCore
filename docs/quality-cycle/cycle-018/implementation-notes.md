# cycle-018 Implementation Notes

## Plan

1. Add a current-page CSV filename sanitizer in `CurrentPageExportButton`.
2. Strip path separators and control characters, remove leading/trailing dots, fall back to `opencore-export`, and force `.csv`.
3. Apply the sanitizer before browser download.
4. Extend Admin smoke checks to require filename sanitization.
5. Update export/OpenForge docs.
6. Run focused checks before the full quality-cycle gate.

## Notes

- This does not change CSV contents, row limits, filtered-row behavior, formula-prefix neutralization or object-cell redaction.
- Existing callers use safe literal resource names; the sanitizer protects future generated or custom filenames at the shared boundary.

## Implemented

- `apps/admin/src/pages/shared/CurrentPageExportButton.tsx` now exports `sanitizeCsvFilename` and applies it before `downloadCsv`.
- `apps/admin/scripts/smoke-test.mjs` now checks filename sanitization, unsafe-character coverage, fallback behavior and `.csv` enforcement.
- `docs/development/export-upload-contract.md`, `docs/development/openforge-template-authoring.md` and `docs/development/openforge-v1-architecture.md` now require local `.csv` basename sanitization.

## Focused Verification

- `pnpm exec prettier --write apps/admin/src/pages/shared/CurrentPageExportButton.tsx apps/admin/scripts/smoke-test.mjs docs/development/export-upload-contract.md docs/development/openforge-template-authoring.md docs/development/openforge-v1-architecture.md docs/quality-cycle/cycle-018/audit.md docs/quality-cycle/cycle-018/reference-comparison.md docs/quality-cycle/cycle-018/backlog.md docs/quality-cycle/cycle-018/implementation-notes.md`
- `NX_DAEMON=false pnpm nx test admin`
- `NX_DAEMON=false pnpm nx run-many -t typecheck -p admin,sdk`
- `NX_DAEMON=false pnpm nx run admin:lint`
- `NX_DAEMON=false pnpm nx test sdk --runInBand`
- `pnpm registry:admin-routes:check`
- `pnpm openforge:doctor`
- `pnpm openforge:gate`

## Full Gate

- `node tools/quality-cycle/opencore-quality-cycle.mjs gate`
