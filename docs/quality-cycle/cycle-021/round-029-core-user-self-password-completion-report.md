# Round 29 Completion Report: core.user Self-password

Date: 2026-06-13
Feature commit: `b46f9bb feat(core-user): add self-password loop`
Public API: `http://144.217.243.161:39172`
Public Admin: `http://144.217.243.161:39174`

## Scope

Round 29 closed the next `core.user` P1 productization gap: authenticated
self-service password change for the current user.

This round remains one deployable, verifiable and reversible stage. It does
not mark the entire user product as complete.

## Delivered

- `UpdateUserPasswordDto` with `oldPassword/newPassword`.
- System user repository/service support for self password updates in seed and
  Prisma implementations.
- Old-password verification and same-password rejection.
- Password hash update for the current authenticated user.
- Auth-only `PATCH /api/core/users/profile/password` endpoint.
- Session revocation for the current user's active online-user sessions after
  successful self password change.
- SDK/OpenAPI/Admin updates for the self-password surface.
- Admin `/personal/profile` `Change password` form that clears the local bearer
  token and redirects to login after success.
- Fixed-port/deploy/public user smoke for wrong old password 401, same password
  400, successful update, stale token 401, old password blocked and new
  password login.

## Verification

- Standard round gates passed; repeated command transcripts were removed during docs compaction.

## Public Verification

- `GET http://144.217.243.161:39172/health/ready` returned 200.
- Public `pnpm smoke:core-user` passed against
  `http://144.217.243.161:39172` with `OPENCORE_SMOKE_CHECK_DOCS=false`.
- Public user smoke verified wrong old password 401, same password 400,
  successful self-password update, stale token 401, old password blocked and
  new password login.
- `GET http://144.217.243.161:39174/personal/profile/` returned 200.
- Public main Admin bundle `umi.4cacaf95.js` contains API origin
  `http://144.217.243.161:39172` and `/core/users/profile/password`, and no
  `/api/api/auth/login`.
- Public Profile chunk `p__Personal__Profile.d2b0fdde.async.js` contains
  `Change password`, `Current password`, `New password`, `Confirm password`,
  `Password changed`, `Sign in again`, `/user/login` and `/personal/profile`.
- Public Admin same-origin proxy login returned 201 for both `/api/auth/login`
  and stale-compatible `/api/api/auth/login`; public API origin
  `/api/api/auth/login` also returned 201.

## Remaining User Product Debt

- Avatar upload and preview.
- Email/phone profile fields if admitted into the OpenCore user schema.
- Social account binding.
- User import/export file workflows.
- User simple-list option endpoint if a consumer workflow requires it.
- Batch user deletion and batch enable/disable with session revocation.
- Dedicated user-page role assignment dialog if admitted separately from the
  role-user assignment flow.
