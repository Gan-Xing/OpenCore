# Cycle-021 Round 17 Completion Report: core.role Menu Assignment

Date: 2026-06-12  
Feature commit:
`13168fc feat(core-role): add role menu assignment loop / 新增角色菜单授权闭环`

## Capability

`core.role` now has a role menu-tree assignment loop. Operators can assign role
menu access from the Admin Roles page, and OpenCore translates selected menu
keys into the permission codes owned by the menu catalog.

## Reference Comparison

RuoYi and Yudao both treat role menu assignment as a first-class RBAC workflow:
the operator sees checked menu tree nodes for a role and saves selected menu
permissions. OpenCore now admits the same workflow within its registry-owned
permission model.

## Implemented

- Added role menu assignment DTOs and service methods in `@opencore/system`.
- Added API endpoints `GET /api/core/roles/:code/menus` and
  `PATCH /api/core/roles/:code/menus`.
- Preserved non-menu permission codes when saving menu assignments.
- Revoked active online-user sessions for users holding the changed role.
- Extended OpenAPI, SDK types/client methods and SDK path tests.
- Added an Admin Roles row action and Menu Assignment tree dialog.
- Added fixed-port `core.role` smoke and wired it into local/deploy scripts.
- Hardened Admin lint so it generates Umi runtime types before TypeScript
  checking.

## Verification

- Standard round gates passed; repeated command transcripts were removed during docs compaction.

- Focused tests for system role service, SDK client paths and API permission
  matrix.
- Focused typecheck for system, SDK, API and Admin.
- Public verification against `http://144.217.243.161:39172` and
  `http://144.217.243.161:39174`.

## Public Result

The public `core.role` smoke created a temporary role and user, logged in as
that user, assigned `system.users` and `system.roles` menus to the role,
verified the old token returned 401, then verified a fresh login contained the
new menu-bound permissions while preserving the non-menu permission. Public
Admin Roles returned 200 and the deployed Roles chunk contains the menu
assignment markers.

## Scope Held

This round did not add role-user assignment, role status toggles, batch role
operations, reset-password/status flows for users or user-mutation session
semantics. Those remain the next `core.role` plus `core.user` enhancement
queue.
