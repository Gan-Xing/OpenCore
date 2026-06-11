# cycle-016 Audit

London time: 2026-06-11 04:59 Europe/London

## Theme

Current-page filter/search object-value sensitive-key redaction.

## Scope

- `apps/admin/src/pages/shared/CurrentPageFilters.tsx`
- Admin smoke test enforcement
- Export/upload contract and OpenForge V1 Admin filter guidance

## Findings

- F1: Current-page search/filter normalization supports array and object fallback values, but object values were serialized with `JSON.stringify(value)` without the nested sensitive-key redaction guard already added to detail JSON sections and CSV object cells.
- F2: Existing page search fields are mostly scalar, but generated or future pages can pass function-based search fields that return object metadata. The shared helper is the right defensive boundary.
- F3: Bounded filters remain preferable to arbitrary query builders, but the safe fallback should still prevent password, secret, token, credential, authorization, API key and client secret values from becoming searchable UI text.

## Decision

Add a recursive current-page filter value redaction helper and apply it before object fallback JSON stringification in `normalizeFilterText`. Preserve existing scalar handling, array joining, lower-casing, filter option generation and current-page filter semantics.
