# cycle-013 Backlog

## Stage 1 - Export Serializer Guard

- [x] P1 Add a shared CSV cell sanitizer to the current-page export helper and call it before quote escaping.

## Stage 2 - Formula Prefix Policy

- [x] P2 Treat optional leading whitespace followed by `=`, `+`, `-` or `@` as formula-like and export those values as text with an apostrophe prefix.

## Stage 3 - Shared Page Coverage

- [x] P3 Confirm admitted and core Admin pages inherit the guard through the shared `CurrentPageExportButton`.

## Stage 4 - Smoke Enforcement

- [x] P4 Extend the Admin smoke test so current-page CSV export must keep formula-prefix neutralization in the serializer path.

## Stage 5 - Export Documentation

- [x] P5 Document formula-prefix neutralization in the export/upload contract and OpenForge V1 generated Admin export guidance.

## Stage 6 - Verification

- [x] P6 Run focused format, typecheck, Admin test/smoke, lint and OpenForge checks for the touched Admin/docs surfaces.

## Closeout

- [x] close1 Update cycle implementation notes with the exact code/docs changes.
- [x] close2 Run the quality-cycle gate for cycle 013.
- [x] close3 Write the completion report.
- [x] close4 Complete cycle 013 with `--run-gate`.
