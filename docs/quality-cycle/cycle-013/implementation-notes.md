# cycle-013 Implementation Notes

## Plan

1. Add a shared sanitizer in `CurrentPageExportButton`.
2. Apply it inside `toCsvCell` before CSV quote escaping.
3. Add a smoke guard for the sanitizer, formula-prefix pattern and serializer call path.
4. Update export/OpenForge docs with the generated Admin CSV safety rule.
5. Run focused Admin and OpenForge verification before the full cycle gate.

## Notes

- The sanitizer prefixes formula-like text with an apostrophe so spreadsheet tools treat it as text.
- The unsafe prefix rule allows leading whitespace before `=`, `+`, `-` or `@`.
- Existing current-page row caps, sensitive-column exclusion and CSV quote escaping remain unchanged.

## Implemented

- `apps/admin/src/pages/shared/CurrentPageExportButton.tsx` now exports `sanitizeCsvCellText` and applies it in `toCsvCell` before quote escaping.
- `apps/admin/scripts/smoke-test.mjs` now checks for the sanitizer, formula-prefix pattern and serializer call path.
- `docs/development/export-upload-contract.md` now defines formula-prefix neutralization for current-page CSV exports.
- `docs/development/openforge-template-authoring.md` and `docs/development/openforge-v1-architecture.md` now require generated Admin CSV exports to neutralize formula prefixes.
- Existing admitted and core Admin exports continue to use the shared `CurrentPageExportButton`, so the guard applies across the current export surface.
