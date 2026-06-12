# Cycle-021 Round 22 Completion Report: core.user Post Binding

Date: 2026-06-12  
Feature commit:
`98e10be feat(core-user): add post binding loop / 新增用户岗位绑定闭环`

## Capability

`core.user` now has a persisted post-binding loop. Operators can assign posts
from the live Users form, user APIs expose `postCodes`, and smoke proves the
assignment is persisted and mutable rather than only displayed in Admin.

## Reference Comparison

RuoYi and Yudao both assign posts/positions from user create/edit workflows.
OpenCore admits the same operator shape with code-based `postCodes`, backed by
the existing live `core.post` capability.

## Implemented

- Added Prisma `UserPost` relation and migration.
- Seeded bootstrap admin with the `admin` post.
- Added `postCodes` to user summary/create/update DTOs, OpenAPI and SDK types.
- Validated duplicate and unknown post codes in seed and Prisma user
  repositories.
- Persisted post assignments on user create/update and removed them during user
  delete.
- Updated Admin Users with post column, detail tags, create/edit multi-select
  and export support.
- Added fixed-port/deploy/public smoke checks for unknown-post rejection,
  create-time binding and update-time clearing.

## Verification

- Prisma generate, validate, migrate and seed.
- Syntax checks for Admin and API smoke scripts.
- Focused system, SDK, API RBAC and security tests.
- Admin tests, OpenAPI export/check, SDK check and registry checks.
- Fixed-port API smoke on `39173`.
- API and Admin builds.
- `pnpm deploy:opencore` deployed API/Admin on fixed ports `39172`/`39174` and
  ran all deploy smokes successfully.
- Public verification against `http://144.217.243.161:39172` and
  `http://144.217.243.161:39174`.

## Public Result

The public `core.user` smoke rejected an unknown post code, created a temporary
user bound to the seeded `engineer` post, cleared that assignment through
update, and revalidated the existing user status/reset/update/delete session
revocation behavior. The public Admin Users page returned 200, the deployed
Users chunk contains `Select posts` and `postCodes`, and the main bundle points
at the API origin without `/api/api/auth/login`.

## Scope Held

This round did not add department side-tree filtering, profile/avatar/social
endpoints, Excel import/export workflows, batch user delete, standalone user
option endpoints or a separate User-page role-assignment dialog. Those remain
future `core.user` product depth.
