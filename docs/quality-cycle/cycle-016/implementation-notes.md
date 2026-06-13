# cycle-016 Implementation Notes

## Plan

1. Add a filter-side recursive redaction helper in `CurrentPageFilters`.
2. Use the same sensitive-key terminology as the detail and export redaction guards.
3. Apply the helper before `JSON.stringify` for object-valued current-page search/filter fallback text.
4. Extend Admin smoke checks to require the helper, sensitive terms and serializer call path.
5. Update export/OpenForge docs to clarify that bounded current-page filter text fallback also redacts sensitive object keys.
6. Run focused checks before the full quality-cycle gate.

## Notes

- This is a defensive fallback for generated or future function-based search fields that may return object metadata.
- Page authors should still prefer explicit scalar search and select fields instead of arbitrary JSON filters.
- The helper intentionally avoids a generic `key` match because Admin search fields can contain safe identifiers such as config keys, storage keys and request ids.

## Implemented

- `apps/admin/src/pages/shared/CurrentPageFilters.tsx` now exports `redactCurrentPageFilterValue` and applies it before object-valued filter/search fallback JSON stringification.
- The helper redacts nested values whose keys match password, secret, token, credential, authorization, API key or client secret terminology.
- `apps/admin/scripts/smoke-test.mjs` now checks that current-page filter/search text normalization keeps object fallback redaction and sensitive-key coverage.
- `docs/development/export-upload-contract.md`, `docs/development/openforge-template-authoring.md` and `docs/development/openforge-v1-architecture.md` now require current-page filter/search object fallback redaction.

## Full Gate

- `node tools/quality-cycle/opencore-quality-cycle.mjs gate`
