# Round 30 Completion Report: core.user Simple-list Option Source

Date: 2026-06-13
Feature commit:
`3dd1b5a feat(core-user): add simple-list option source / 新增用户精简选项源`
Public API: `http://144.217.243.161:39172`
Public Admin: `http://144.217.243.161:39174`

## Scope

Round 30 closed the next `core.user` P1 productization gap: an authenticated
enabled-user simple-list option source with a real Admin consumer.

This round remains one deployable, verifiable and reversible stage. It does
not mark the entire user product as complete.

## Delivered

- `UserOptionDto` with `id`, `username`, `displayName`, `deptId` and
  `postCodes`.
- System user repository/service support for `listUserOptions()` in seed and
  Prisma implementations.
- Enabled-user filtering and department-subtree filtering for the option
  source.
- Auth-only `GET /api/core/users/simple-list`, without requiring
  `core:user:read`.
- SDK/OpenAPI/Admin updates for the user option source.
- Admin Roles User Assignment transfer dialog consuming
  `listOpenCoreUserOptions()` for user labels.
- Fixed-port/deploy/public user smoke for auth guard 401, unknown-department
  404, department filtering, enabled-only filtering and lightweight option
  shape without `roleCodes`, `enabled` or `system`.

## Verification

- Standard round gates passed; repeated command transcripts were removed during docs compaction.

## Public Verification

- `GET http://144.217.243.161:39172/health/ready` returned 200.
- `GET http://144.217.243.161:39174/system/roles/` returned 200.
- Public `pnpm smoke:core-user` passed against
  `http://144.217.243.161:39172` with `OPENCORE_SMOKE_CHECK_DOCS=false`.
- Public user smoke verified unauthenticated simple-list 401, authenticated
  consumption, unknown-department 404, department filtering, disabled-user
  filtering, enabled-user re-entry and option shape without management fields.
- Public main Admin bundle `umi.a7593895.js` contains API origin
  `http://144.217.243.161:39172` and `/core/users/simple-list`, and no
  `/api/api/auth/login`.
- Public Roles chunk `p__System__Roles.978efe8a.async.js` contains
  `User Assignment`, `Available users` and `Assigned users`.
- Public Admin same-origin proxy login returned 201 for both `/api/auth/login`
  and stale-compatible `/api/api/auth/login`; public API origin
  `/api/api/auth/login` also returned 201.

## Remaining User Product Debt

- Avatar upload and preview.
- Email/phone profile fields if admitted into the OpenCore user schema.
- Social account binding.
- User import/export file workflows.
- Batch user deletion and batch enable/disable with session revocation.
- Dedicated user-page role assignment dialog if admitted separately from the
  role-user assignment flow.
