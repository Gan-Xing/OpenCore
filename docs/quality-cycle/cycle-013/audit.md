# cycle-013 Audit

London time: 2026-06-11 04:31 Europe/London

## Theme

Current-page CSV formula-injection safety.

## Scope

- `apps/admin/src/pages/shared/CurrentPageExportButton.tsx`
- Admin smoke test enforcement
- Export contract and OpenForge V1 Admin export guidance

## Findings

- F1: `CurrentPageExportButton` escaped quotes and excluded sensitive columns, but cells beginning with formula prefixes such as `=`, `+`, `-` or `@` were serialized directly into CSV.
- F2: S10/S11/S12 and core Admin pages now share this current-page CSV export helper, so a shared sanitizer covers all fixture-backed exported values without page-level duplication.
- F3: OpenForge docs required bounded current-page CSV and sensitive-column exclusion, but did not require spreadsheet formula-prefix neutralization for generated Admin exports.

## Decision

Add a shared CSV text sanitizer that prefixes formula-like values with an apostrophe before quote escaping. Treat optional leading whitespace before `=`, `+`, `-` or `@` as unsafe. Keep the existing CSV quoting, current-page row cap and sensitive-column exclusion behavior unchanged.
