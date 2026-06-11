# cycle-010 Implementation Notes

## Plan

- Add a reusable read-only detail contract to the core Admin wrappers.
- Wire detail field/json metadata into S6 RBAC pages.
- Wire detail field/json metadata into S7 system pages and keep config secret values redacted.
- Wire detail field/json metadata into security log pages.
- Extend Admin smoke coverage for core detail drawer parity.
- Update OpenForge docs for generated core detail metadata.

## Implemented

- Added a read-only detail contract to `RbacTable` and `SystemManagementTable`, including detail fields, optional JSON sections, optional timeline metadata and per-row titles.
- Added stable Detail actions to the core wrappers and rendered `ReadOnlyDetailDrawer` from selected row data without backend calls or mutations.
- Added detail metadata to RBAC pages: users, roles, permissions and menus.
- Added detail metadata to system pages: dictionaries, system config and files.
- Added a shared system config value formatter so detail drawers and current-page CSV export both return `[redacted]` for `visibility === 'secret'`.
- Added a safe secret-visibility config fixture sample and SDK assertion.
- Added detail metadata to security log pages, including operation log metadata JSON.
- Extended Admin smoke coverage so core wrappers must render `ReadOnlyDetailDrawer` and core pages must pass `detailFields={detailFields}`.
- Updated OpenForge V1 docs so generated core Admin wrappers expose read-only detail metadata and config detail redaction.

## Focused Verification

- `pnpm exec prettier --write ...`
- `NX_DAEMON=false pnpm nx run-many -t typecheck -p admin,sdk`
- `NX_DAEMON=false pnpm nx test admin`
- `NX_DAEMON=false pnpm nx run admin:lint`
- `NX_DAEMON=false pnpm nx test sdk --runInBand`
- `pnpm registry:admin-routes:check`
- `pnpm openforge:doctor && pnpm openforge:gate`
