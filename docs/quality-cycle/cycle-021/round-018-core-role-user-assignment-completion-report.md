# Cycle-021 Round 18 Completion Report: core.role User Assignment

Date: 2026-06-12  
Feature commit:
`b4f8117 feat(core-role): add role user assignment loop / 新增角色用户分配闭环`

## Capability

`core.role` now has a role-user assignment loop. Operators can assign normal
users to a role from the Admin Roles page, and OpenCore invalidates affected
active sessions so stale bearer tokens cannot keep old role or permission
state.

## Reference Comparison

RuoYi exposes assigned and unassigned user workflows from role management.
Yudao exposes equivalent role/user assignment through permission APIs. OpenCore
now admits the same role-side assignment workflow within its existing user and
online-session boundaries.

## Implemented

- Added role-user assignment DTOs and service methods in `@opencore/system`.
- Added seed and Prisma repository support for reading assigned and available
  users for a role.
- Rejected malformed payloads, duplicate user IDs, missing users and system
  users before assignment mutation.
- Added API endpoints `GET /api/core/roles/:code/users` and
  `PATCH /api/core/roles/:code/users`.
- Revoked active online-user sessions for users whose role assignment changed.
- Extended OpenAPI, SDK types/client methods and SDK path tests.
- Added an Admin Roles row action and User Assignment `Transfer` dialog.
- Extended fixed-port `core.role` smoke and wired role-user checks into
  local/deploy/public verification.

## Verification

- `node --check tools/scripts/smoke-core-role.mjs`
- Focused tests for system user role assignment, SDK client paths and API
  permission matrix.
- Focused typecheck for system, API and Admin.
- `pnpm openapi:export`
- `pnpm nx test admin`
- `pnpm sdk:check`
- `pnpm openapi:check`
- `pnpm openapi:registry-tags:check`
- `pnpm registry:admin-routes:check`
- `pnpm smoke:api:local`
- `pnpm format:check`
- `pnpm prisma:validate`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm deploy:opencore`
- Public verification against `http://144.217.243.161:39172` and
  `http://144.217.243.161:39174`.

## Public Result

The public `core.role` smoke created a temporary role and user, verified the
role's assigned users, removed the user from the role, proved the old token
returned 401, then re-added the user and proved a fresh login contained the
expected role and permissions. Public Admin Roles returned 200 and the deployed
Roles chunk contains the user assignment markers.

## Scope Held

This round did not add role status toggles, batch role operations, separate
User-page role assignment, reset-password/status flows for users or direct
user-mutation session semantics. Those remain in the next `core.role` plus
`core.user` enhancement queue.
