# cycle-014 Backlog

## Stage 1 - Route Binding Parser

- [x] P1 Parse Admin `.umirc.ts` route objects and collect `path -> access` bindings without relying on broad string includes.

## Stage 2 - Access Permission Parser

- [x] P2 Parse `apps/admin/src/access.ts` and collect `permissionCode -> accessKey` bindings from `hasPermission(...)` helpers.

## Stage 3 - Registry Comparison

- [x] P3 Extend `registry:admin-routes:check` so each module registry Admin route permission must match the actual `.umirc.ts` route access key.

## Stage 4 - Existing Drift Coverage

- [x] P4 Preserve existing missing-route and missing-permission drift errors while adding mismatched-access diagnostics.

## Stage 5 - Documentation

- [x] P5 Document binding-level Admin route/access drift in module admission and OpenForge CI guidance.

## Stage 6 - Verification

- [x] P6 Run focused formatting, route/access drift check, typecheck, Admin test/lint and OpenForge checks.

## Closeout

- [x] close1 Update cycle implementation notes with the exact code/docs changes.
- [x] close2 Run the quality-cycle gate for cycle 014.
- [x] close3 Write the completion report.
- [x] close4 Complete cycle 014 with `--run-gate`.
