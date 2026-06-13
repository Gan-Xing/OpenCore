# Cycle-021 Round 041 Core User Role Assignment Completion Report

Date: 2026-06-13

## Capability

`core.user` dedicated user-side role assignment.

## Reference Comparison

Yudao exposes user role assignment through user-focused permission APIs and a
user-table assignment modal. RuoYi also treats role assignment as a basic user
management action. OpenCore already had role-side user assignment, but the
Users page still lacked the dedicated user-side workflow.

## Delivered

- Added `core:user:manage` for user-side role assignment.
- Added `GET/PATCH /api/core/users/:id/roles`.
- Added typed DTOs, repository/service contracts and seed/Prisma
  implementations.
- Rejected duplicate role codes, missing roles and system-user assignment.
- Revoked active sessions when a user's role set changes.
- Extended OpenAPI, SDK, registry fixtures and API permission matrix.
- Added Admin `canAssignUserRoles`.
- Added Admin Users `Assign Roles` modal with missing-permission and system-user
  disabled states.
- Extended Admin static smoke and fixed-port/deploy/public `core.user` smoke
  with role-assignment guards.

## Verification

- Standard round gates passed; repeated command transcripts were removed during docs compaction.

## Public Verification

- API: `http://144.217.243.161:39172`
- Admin: `http://144.217.243.161:39174`
- Public `pnpm smoke:core-user` passed, including
  `core.user.role-assignment.*` checks.
- Public Admin Users chunk `p__System__Users.9f27a9ab.async.js` contains
  `Assign Roles`, `Missing core:user:manage`,
  `System users cannot be assigned roles`, `Roles assigned.` and
  `Select roles`.
- Public Admin main bundle `umi.a0a7b9b5.js` contains the API origin and no
  duplicate `/api/api` prefix.
- Public Admin same-origin login and public API login both succeeded.

## Commits

- Feature:
  `fdfbd12 feat(core-user): add dedicated user role assignment / 新增用户侧角色分配`
- Docs: this documentation commit.

## Remaining Debt

`core.user` now meets the current admitted OpenCore waterline. Email, phone and
social-account profile expansion remain outside the admitted scope until a
future round explicitly admits them.
