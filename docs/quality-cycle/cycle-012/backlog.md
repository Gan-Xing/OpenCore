# cycle-012 Backlog

## Stage 1 - Shared Renderer Guard

- [x] P1 Add a shared recursive detail JSON redaction helper to `ReadOnlyDetailDrawer` and route JSON serialization through it.

## Stage 2 - Admitted Page Coverage

- [x] P2 Confirm collaboration, operations, optional and integration pages inherit the shared redaction guard through existing `jsonSections` usage.

## Stage 3 - Core Page Coverage

- [x] P3 Confirm system/security pages inherit the shared redaction guard while preserving explicit source-level config secret redaction.

## Stage 4 - Smoke Enforcement

- [x] P4 Extend the Admin smoke test so future drawer changes must keep recursive sensitive-key redaction before JSON serialization.

## Stage 5 - OpenForge Documentation

- [x] P5 Document the generated Admin detail JSON redaction contract in OpenForge V1 authoring and architecture docs.

## Stage 6 - Verification

- [x] P6 Run focused format, typecheck, test, lint and OpenForge gates for the touched Admin and SDK surfaces.

## Closeout

- [x] close1 Update cycle implementation notes with the exact code/docs changes.
- [x] close2 Run the quality-cycle gate for cycle 012.
- [x] close3 Write the completion report.
- [x] close4 Complete cycle 012 with `--run-gate`.
