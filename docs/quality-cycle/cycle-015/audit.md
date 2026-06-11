# cycle-015 Audit

London time: 2026-06-11 04:48 Europe/London

## Theme

Current-page CSV object-cell sensitive-key redaction.

## Scope

- `apps/admin/src/pages/shared/CurrentPageExportButton.tsx`
- Admin smoke test enforcement
- Export/upload contract and OpenForge V1 Admin export guidance

## Findings

- F1: Current-page CSV export excludes columns marked `sensitive`, but object-valued non-sensitive cells fell back to `JSON.stringify(value)` without a nested sensitive-key redaction guard.
- F2: Existing pages generally avoid exporting object payloads or mark sensitive object columns as excluded. The shared helper still needs a defensive fallback for generated or future page columns.
- F3: Cycle 012 added shared redaction for detail drawer JSON sections, but export object-cell fallback serialization did not have an equivalent final guard.

## Decision

Add a recursive export value redaction helper that masks values for object keys matching password, secret, token, credential, authorization, API key or client secret terminology before object fallback JSON stringification. Keep existing sensitive-column exclusion, current-page row caps, CSV quote escaping and formula-prefix neutralization unchanged.
