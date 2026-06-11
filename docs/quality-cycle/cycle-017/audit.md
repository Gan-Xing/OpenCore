# cycle-017 Audit

London time: 2026-06-11 05:08 Europe/London

## Theme

Admin scalar detail/list sensitive-field redaction.

## Scope

- `apps/admin/src/pages/shared/ReadOnlyDetailDrawer.tsx`
- Integration provider list/detail sensitive fields
- Online user detail sensitive fields
- Admin smoke test enforcement
- OpenForge V1 Admin detail guidance

## Findings

- F1: Cycle 012 protected read-only detail JSON sections with recursive sensitive-key redaction, but scalar `DetailField` values had no explicit sensitive flag.
- F2: Integration provider details rendered `Secret Ref` as a raw scalar value, and the provider list table also displayed the raw secret reference despite export excluding it.
- F3: Online user details rendered `Token ID` and `Revoked Reason` as raw scalar values, while current-page export already marked those columns sensitive and excluded them.

## Decision

Add explicit scalar detail-field redaction to the shared drawer, mark the known provider and online-session sensitive fields, and redact the provider list secret reference. Keep JSON section redaction and current-page export exclusion unchanged.
