# cycle-014 Implementation Notes

## Plan

1. Use the TypeScript compiler API in `check-admin-route-access.ts`.
2. Extract route `path` and `access` string properties from Admin `.umirc.ts` object literals.
3. Extract access helper names and permission codes from `hasPermission('...')` calls in `apps/admin/src/access.ts`.
4. Compare each module registry Admin route permission to the access helper bound to the matching route path.
5. Update docs so future module admissions understand route path presence, permission presence and access binding alignment as separate drift concerns.
6. Run focused checks before the full quality-cycle gate.

## Notes

- Duplicate access helpers for the same permission keep the first declaration as the canonical access key. This preserves `canAccessDashboard` over the later `canReadHealth` alias.
- Exception routes such as `/403`, `/404`, `/500` and wildcard routes are outside module registry Admin routes and are not checked for access bindings.
- The script still reports missing Admin routes and missing access permission helpers.

## Implemented

- `tools/scripts/check-admin-route-access.ts` now uses TypeScript AST parsing for Admin route `path/access` bindings and access helper `permissionCode/accessKey` bindings.
- The drift check now reports `mismatched-admin-route-access` when a module registry Admin route path is present but bound to the wrong `.umirc.ts` access key.
- `docs/development/module-admission-checklist.md` now requires Admin route access keys to map to the same permission code declared by the module registry route.
- `docs/development/openforge-ci-gate.md` now includes `pnpm openapi:registry-tags:check` and `pnpm registry:admin-routes:check` in the full local gate command list, with CI guidance to fail on route/access binding drift.

## Focused Verification

- `pnpm exec prettier --write tools/scripts/check-admin-route-access.ts docs/development/module-admission-checklist.md docs/development/openforge-ci-gate.md docs/quality-cycle/cycle-014/audit.md docs/quality-cycle/cycle-014/reference-comparison.md docs/quality-cycle/cycle-014/backlog.md docs/quality-cycle/cycle-014/implementation-notes.md`
- `pnpm registry:admin-routes:check`
- `NX_DAEMON=false pnpm nx run-many -t typecheck -p admin,module-registry`
- `NX_DAEMON=false pnpm nx test admin`
- `NX_DAEMON=false pnpm nx run admin:lint`
- `pnpm openforge:doctor`
- `pnpm openforge:gate`
