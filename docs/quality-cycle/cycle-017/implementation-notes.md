# cycle-017 Implementation Notes

## Plan

1. Extend `DetailField` with an explicit `sensitive` flag.
2. Render sensitive scalar detail fields as `[redacted]` in `ReadOnlyDetailDrawer`.
3. Mark known sensitive scalar detail fields in integration provider and online-user detail drawers.
4. Redact the integration provider list's secret reference column.
5. Extend Admin smoke checks and OpenForge docs for scalar detail/list redaction.
6. Run focused checks before the full quality-cycle gate.

## Notes

- This complements recursive JSON-section redaction; it does not replace source/API redaction.
- Export-sensitive column definitions remain the source for CSV exclusion. Detail fields now have their own explicit UI redaction metadata.
- The provider list still shows that a secret reference exists, but never renders the raw reference value.

## Implemented

- `apps/admin/src/pages/shared/ReadOnlyDetailDrawer.tsx` now supports `DetailField.sensitive` and renders sensitive scalar fields as `[redacted]`.
- `apps/admin/src/pages/Integrations/Providers.tsx` redacts the provider list `Secret Ref` column and marks the provider detail `Secret Ref` field sensitive.
- `apps/admin/src/pages/Monitor/OnlineUsers.tsx` marks `Token ID` and `Revoked Reason` detail fields sensitive.
- `apps/admin/scripts/smoke-test.mjs` now checks scalar detail redaction support plus provider and online-session sensitive bindings.
- `docs/development/openforge-template-authoring.md` and `docs/development/openforge-v1-architecture.md` now require generated Admin detail metadata to mark scalar sensitive fields.

## Verification

Focused checks and the applicable gate passed. Command transcripts are intentionally omitted; keep unique defects, guards and decisions only.

## Full Gate

- `node tools/quality-cycle/opencore-quality-cycle.mjs gate`
