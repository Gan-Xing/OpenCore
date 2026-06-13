# cycle-017 Completion Report

London time: 2026-06-11 05:13 Europe/London

## Summary

Cycle 017 hardened Admin scalar sensitive-field rendering. Shared read-only detail fields now support explicit `sensitive` metadata, and known provider/online-session scalar secrets are redacted in detail/list UI instead of relying only on CSV export exclusion or JSON-section redaction.

## Changes

- Added `DetailField.sensitive` support in `ReadOnlyDetailDrawer`.
- Rendered sensitive scalar detail fields as `[redacted]`.
- Redacted the integration provider list `Secret Ref` column and provider detail `Secret Ref` field.
- Marked online-session `Token ID` and `Revoked Reason` detail fields sensitive.
- Extended Admin smoke tests and OpenForge V1 docs to enforce scalar sensitive-field redaction.

## Follow-Up

- Future generated Admin detail fields that expose token ids, secret refs, credentials or authorization values must use `sensitive: true` even when CSV export already excludes the same columns.
