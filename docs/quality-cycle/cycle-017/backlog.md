# cycle-017 Backlog

## Stage 1 - Shared Scalar Redaction

- [x] P1 Add an explicit `sensitive` flag to shared read-only detail fields.

## Stage 2 - Drawer Rendering

- [x] P2 Render sensitive scalar detail fields as `[redacted]` while preserving existing empty-value fallback and JSON section redaction.

## Stage 3 - Known Sensitive Fields

- [x] P3 Mark integration provider secret references and online-session token/revocation fields as sensitive in detail drawers.

## Stage 4 - List Surface

- [x] P4 Redact the integration provider list's scalar secret reference column.

## Stage 5 - Smoke And Documentation

- [x] P5 Extend Admin smoke checks and OpenForge docs so scalar detail/list sensitive redaction remains required.

## Stage 6 - Verification

- [x] P6 Run focused formatting, Admin typecheck/test/lint, SDK tests, route drift and OpenForge checks.

## Closeout

- [x] close1 Update cycle implementation notes with the exact code/docs changes.
- [x] close2 Run the quality-cycle gate for cycle 017.
- [x] close3 Write the completion report.
- [x] close4 Complete cycle 017 with `--run-gate`.
