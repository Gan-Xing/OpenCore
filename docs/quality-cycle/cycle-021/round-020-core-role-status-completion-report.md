# Cycle-021 Round 20 Completion Report: core.role Status Security

Date: 2026-06-12  
Feature commit:
`32a6f5d feat(core-role): add role status security loop / 新增角色状态安全闭环`

## Capability

`core.role` now has a status security loop. Operators can disable or enable
roles, update roles and delete roles while OpenCore invalidates affected active
sessions and keeps disabled roles out of future login authorization results.

## Reference Comparison

RuoYi and Yudao both treat role status as a basic RBAC control. OpenCore now
admits that product shape inside its existing role and online-session
boundaries: role status is persisted, shown in Admin, enforced during auth/RBAC
calculation and tied to session revocation.

## Implemented

- Added persisted `Role.enabled`, Prisma migration and seed/default handling.
- Added strict status DTO/runtime validation so `enabled` must be a boolean.
- Added `PATCH /api/core/roles/:code/status`, guarded by `core:role:update`.
- Prevented system roles from being disabled.
- Filtered disabled roles out of login `roleCodes`, permission aggregation and
  data-scope role calculations.
- Returned `revokedSessionCount` from role update/status/delete mutations.
- Revoked affected active online-user sessions after role status changes,
  direct role updates and role deletes.
- Extended OpenAPI, SDK contracts/client methods and SDK tests.
- Added Admin Roles status filter, status column, enable/disable controls and
  revoked-session feedback.
- Extended fixed-port/deploy/public `core.role` smoke to cover disable/enable,
  disabled-role filtering and update/delete session revocation.

## Verification

- `pnpm prisma:generate` and `pnpm prisma:migrate`.
- `node --check tools/scripts/smoke-core-role.mjs`.
- Focused system, SDK, API permission-matrix and API Prisma RBAC tests.
- Focused typecheck for system, API and Admin.
- Admin tests, OpenAPI export/check, SDK check and registry checks.
- `pnpm smoke:api:local` on fixed smoke port `39173`.
- Full gates: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`,
  `pnpm build` and `pnpm prisma:validate`.
- `pnpm deploy:opencore` deployed API/Admin on fixed ports `39172`/`39174` and
  ran all deploy smokes successfully.
- Public verification against `http://144.217.243.161:39172` and
  `http://144.217.243.161:39174`.

## Public Result

The public `core.role` smoke created a temporary role and user, disabled the
role, proved the old token returned 401 and a fresh login no longer carried
the disabled role permission, re-enabled the role, proved relogin restored
authorization, then verified direct role update and delete both revoked active
sessions. The public Admin Roles page returned 200 and the deployed Roles
chunk contains the status controls and revoked-session UI markers.

## Scope Held

This round did not add role batch operations, a standalone data-scope endpoint,
role simple-list endpoints or a separate user-page role assignment workflow.
Those remain optional role-product enhancements outside the current basic RBAC
waterline.
